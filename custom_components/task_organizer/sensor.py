"""Sensoren für den TaskOrganizer."""
import json
from datetime import datetime, timedelta

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant

from .const import DEFAULT_OVERDUE_DAYS, DOMAIN, EVENT_TASK_UPDATED

async def async_setup_entry(hass: HomeAssistant, entry, async_add_entities):
    """
    Initialize all sensors for the TaskOrganizer integration.
    
    :param hass: The Home Assistant instance.
    :param entry: The config entry.
    :param async_add_entities: Callback to add entities to HA.
    """
    sensors = [
        TaskOrganizerAllTasksSensor(hass),
        TaskOrganizerDueTasksSensor(hass),
        TaskOrganizerOverdueTasksSensor(hass),
        TaskOrganizerDueAndOverdueTasksSensor(hass),
        TaskOrganizerSettingsSensor(hass),
        TaskOrganizerPointsSensor(hass),
        TaskOrganizerLeaderboardSensor(hass),
    ]
    async_add_entities(sensors)


class TaskOrganizerBaseSensor(SensorEntity):
    """Base class representing a generic Task Organizer sensor."""
    
    _attr_has_entity_name = True

    def __init__(self, hass: HomeAssistant, unique_id: str, translation_key: str):
        """
        Initialize the base sensor.
        
        :param hass: The Home Assistant instance.
        :param unique_id: The unique identifier for this sensor.
        :param translation_key: The string key used for translations.
        """
        self.hass = hass
        self._attr_unique_id = unique_id
        self._attr_translation_key = translation_key
        self._data = hass.data[DOMAIN]["data"]

    async def async_added_to_hass(self):
        """Hook called when the entity is added to Home Assistant."""
        self.async_on_remove(
            self.hass.bus.async_listen(EVENT_TASK_UPDATED, self._handle_update)
        )

    async def _handle_update(self, event):
        """Callback to handle data updates from the event bus."""
        self._data = self.hass.data[DOMAIN]["data"]
        self.async_write_ha_state()


class TaskOrganizerAllTasksSensor(TaskOrganizerBaseSensor):
    """Sensor tracking the total number of tasks."""
    
    def __init__(self, hass: HomeAssistant):
        super().__init__(hass, "task_organizer_all_tasks", "all_tasks")
        self._attr_icon = "mdi:calendar-check-outline"

    @property
    def state(self) -> int:
        """Return the total amount of tasks."""
        return len(self._data.get("tasks", {}))

    @property
    def extra_state_attributes(self) -> dict:
        """Return task array as state attributes."""
        tasks_list = list(self._data.get("tasks", {}).values())
        return {
            "json_string": json.dumps(tasks_list), 
            "data": tasks_list
        }


class TaskOrganizerDueTasksSensor(TaskOrganizerBaseSensor):
    """Sensor tracking the number of currently due tasks."""
    
    def __init__(self, hass: HomeAssistant):
        """Initialize the sensor for due tasks."""
        super().__init__(hass, "task_organizer_due_tasks", "due_tasks")
        self._attr_icon = "mdi:calendar-check"

    def _get_due_tasks(self) -> list:
        """Helper to extract tasks that are due but not overdue."""
        now = datetime.now().date()
        settings = self._data.get("settings", {})
        overdue_days = settings.get("overdue_days", DEFAULT_OVERDUE_DAYS)

        due_tasks = []
        for task in self._data.get("tasks", {}).values():
            if task.get("due_date"):
                paused_until_str = task.get("paused_until")
                is_paused = False
                if paused_until_str:
                    paused_date = datetime.fromisoformat(paused_until_str).date()
                    if now <= paused_date:
                        is_paused = True

                due_date = datetime.fromisoformat(task["due_date"]).date()
                # A task is due if its due date is today or in the past, but not yet past the overdue threshold.
                if not is_paused and due_date <= now and due_date > (now - timedelta(days=overdue_days)):
                    due_tasks.append(task)
        return due_tasks

    @property
    def state(self) -> int:
        """Return the count of due tasks."""
        return len(self._get_due_tasks())

    @property
    def extra_state_attributes(self) -> dict:
        """Return due tasks array as state attributes."""
        due_tasks = self._get_due_tasks()
        return {
            "json_string": json.dumps(due_tasks), 
            "data": due_tasks
        }


class TaskOrganizerOverdueTasksSensor(TaskOrganizerBaseSensor):
    """Sensor tracking the number of overdue tasks."""

    def __init__(self, hass: HomeAssistant):
        """Initialize the sensor for overdue tasks."""
        super().__init__(hass, "task_organizer_overdue_tasks", "overdue_tasks")
        self._attr_icon = "mdi:calendar-alert"

    def _get_overdue_tasks(self) -> list:
        """Helper to extract tasks that are overdue."""
        now = datetime.now().date()
        settings = self._data.get("settings", {})
        overdue_days = settings.get("overdue_days", DEFAULT_OVERDUE_DAYS)

        overdue_tasks = []
        for task in self._data.get("tasks", {}).values():
            if task.get("due_date"):
                paused_until_str = task.get("paused_until")
                is_paused = False
                if paused_until_str:
                    paused_date = datetime.fromisoformat(paused_until_str).date()
                    if now <= paused_date:
                        is_paused = True

                due_date = datetime.fromisoformat(task["due_date"]).date()
                # A task is overdue if its due date is past the overdue threshold.
                if not is_paused and due_date <= (now - timedelta(days=overdue_days)):
                    overdue_tasks.append(task)
        return overdue_tasks

    @property
    def state(self) -> int:
        """Return the count of overdue tasks."""
        return len(self._get_overdue_tasks())

    @property
    def extra_state_attributes(self) -> dict:
        """Return overdue tasks array as state attributes."""
        overdue_tasks = self._get_overdue_tasks()
        return {"json_string": json.dumps(overdue_tasks), "data": overdue_tasks}


class TaskOrganizerDueAndOverdueTasksSensor(TaskOrganizerBaseSensor):
    """Sensor tracking the number of due and overdue tasks combined."""

    def __init__(self, hass: HomeAssistant):
        """Initialize the sensor for due and overdue tasks."""
        super().__init__(
            hass, "task_organizer_due_and_overdue_tasks", "due_and_overdue_tasks"
        )
        self._attr_icon = "mdi:calendar-multiple-check"

    def _get_due_and_overdue_tasks(self) -> list:
        """Helper to extract tasks that are due today or earlier."""
        now = datetime.now().date()
        due_tasks = []
        for task in self._data.get("tasks", {}).values():
            if task.get("due_date"):
                paused_until_str = task.get("paused_until")
                is_paused = False
                if paused_until_str:
                    paused_date = datetime.fromisoformat(paused_until_str).date()
                    if now <= paused_date:
                        is_paused = True

                due_date = datetime.fromisoformat(task["due_date"]).date()
                if not is_paused and due_date <= now:
                    due_tasks.append(task)
        return due_tasks

    @property
    def state(self) -> int:
        """Return the count of due and overdue tasks."""
        return len(self._get_due_and_overdue_tasks())

    @property
    def extra_state_attributes(self) -> dict:
        """Return due and overdue tasks array as state attributes."""
        due_tasks = self._get_due_and_overdue_tasks()
        return {"json_string": json.dumps(due_tasks), "data": due_tasks}


class TaskOrganizerSettingsSensor(TaskOrganizerBaseSensor):
    """Sensor tracking the integration settings."""

    def __init__(self, hass: HomeAssistant):
        super().__init__(hass, "task_organizer_settings", "settings")
        self._attr_icon = "mdi:cog"

    @property
    def state(self) -> str:
        """Return a generic OK state."""
        return "OK"

    @property
    def extra_state_attributes(self) -> dict:
        """Return the settings as state attributes."""
        return self._data.get("settings", {})


class TaskOrganizerPointsSensor(TaskOrganizerBaseSensor):
    """Sensor tracking the points of all users."""

    def __init__(self, hass: HomeAssistant):
        super().__init__(hass, "task_organizer_points", "points")
        self._attr_icon = "mdi:star"

    @property
    def state(self) -> float:
        """Return the sum of all points."""
        return sum(self._data.get("points", {}).values())

    @property
    def extra_state_attributes(self) -> dict:
        """Return the points list as state attributes."""
        pts = self._data.get("points", {})
        points_list = []
        for uid, p in pts.items():
            name = uid
            for state in self.hass.states.async_all("person"):
                if state.attributes.get("user_id") == uid:
                    name = state.attributes.get("friendly_name", uid)
                    break
            points_list.append({"user_id": uid, "name": name, "points": p})
        return {"json_string": json.dumps(points_list), "data": points_list}


class TaskOrganizerLeaderboardSensor(TaskOrganizerBaseSensor):
    """Sensor tracking the current leaderboard leader."""

    def __init__(self, hass: HomeAssistant):
        super().__init__(hass, "task_organizer_leaderboard", "leaderboard")
        self._attr_icon = "mdi:trophy"

    @property
    def state(self) -> str:
        """Return the name of the user with the most points."""
        points = self._data.get("points", {})
        if not points:
            return "Niemand"
        best_user_id = max(points, key=points.get)
        if points[best_user_id] == 0:
            return "Niemand"
        for state in self.hass.states.async_all("person"):
            if state.attributes.get("user_id") == best_user_id:
                return state.attributes.get("friendly_name", best_user_id)
        return best_user_id

    @property
    def extra_state_attributes(self) -> dict:
        """Return the sorted leaderboard as state attributes."""
        points = self._data.get("points", {})
        sorted_users = sorted(points.items(), key=lambda item: item[1], reverse=True)
        leaderboard = []
        for uid, pts in sorted_users:
            name = uid
            for state in self.hass.states.async_all("person"):
                if state.attributes.get("user_id") == uid:
                    name = state.attributes.get("friendly_name", uid)
                    break
            leaderboard.append({"user_id": uid, "name": name, "points": pts})
        return {"json_string": json.dumps(leaderboard), "data": leaderboard}