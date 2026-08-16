"""Calendar platform for the TaskOrganizer integration."""

import logging
from datetime import datetime, timedelta, date

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, EVENT_TASK_UPDATED

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the Calendar platform for TaskOrganizer."""
    async_add_entities([TaskOrganizerCalendar(hass)])


class TaskOrganizerCalendar(CalendarEntity):
    """Calendar entity to display tasks and history."""

    _attr_has_entity_name = True
    _attr_name = "Aufgaben Kalender"

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the calendar."""
        self.hass = hass
        self._attr_unique_id = f"{DOMAIN}_calendar"
        self._events: list[CalendarEvent] = []

    @property
    def event(self) -> CalendarEvent | None:
        """Return the next upcoming calendar event."""
        self._update_events()
        today = dt_util.now().date()
        
        future_events = [e for e in self._events if e.start >= today]
        if not future_events:
            return None
            
        # Sort by start date to find the next one
        future_events.sort(key=lambda e: e.start)
        return future_events[0]

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[CalendarEvent]:
        """Return calendar events within a datetime range."""
        self._update_events()
        
        # Convert start/end to dates for easier comparison with all-day events
        start_period = start_date.date()
        end_period = end_date.date()
        
        filtered_events = []
        for event in self._events:
            # Check if the event's start date is within the requested window
            if start_period <= event.start <= end_period:
                filtered_events.append(event)
                
        return filtered_events

    def _update_events(self) -> None:
        """Fetch tasks and history from integration data and convert to CalendarEvents."""
        if DOMAIN not in self.hass.data or "data" not in self.hass.data[DOMAIN]:
            self._events = []
            return
            
        data = self.hass.data[DOMAIN]["data"]
        events: list[CalendarEvent] = []
        today = dt_util.now().date()

        # 1. Add pending tasks
        for task in data.get("tasks", {}).values():
            due_date_str = task.get("due_date")
            if not due_date_str:
                continue

            try:
                parsed_due = dt_util.parse_datetime(due_date_str)
                if parsed_due is None:
                    continue
                due_date_local = dt_util.as_local(parsed_due).date()
            except (ValueError, TypeError):
                continue
            
            # Overdue tasks stay on today
            start_date = today if due_date_local < today else due_date_local
            end_date = start_date + timedelta(days=1)
            
            # Construct description
            description = task.get("description", "")
            if task.get("category"):
                description += f"\nKategorie: {task['category']}"
            if task.get("area"):
                description += f"\nBereich: {task['area']}"

            events.append(
                CalendarEvent(
                    start=start_date,
                    end=end_date,
                    summary=task.get("name", "Unbekannte Aufgabe"),
                    description=description.strip(),
                )
            )

        # 2. Add completed tasks (history)
        for item in data.get("history", []):
            timestamp_str = item.get("timestamp")
            if not timestamp_str:
                continue
                
            try:
                parsed_time = dt_util.parse_datetime(timestamp_str)
                if parsed_time is None:
                    continue
                completed_date = dt_util.as_local(parsed_time).date()
            except (ValueError, TypeError):
                continue

            start_date = completed_date
            end_date = start_date + timedelta(days=1)

            # Resolve user friendly name if possible
            user_id = item.get("user_id")
            user_name = user_id
            for state in self.hass.states.async_all("person"):
                if state.attributes.get("user_id") == user_id:
                    user_name = state.attributes.get("friendly_name", user_id)
                    break

            description = f"Erledigt von: {user_name}\nPunkte: {item.get('points', 0)}"

            events.append(
                CalendarEvent(
                    start=start_date,
                    end=end_date,
                    summary=item.get("task_name", "Unbekannte Aufgabe"),
                    description=description,
                )
            )

        self._events = events

    async def async_added_to_hass(self) -> None:
        """Register callbacks."""
        self.async_on_remove(
            self.hass.bus.async_listen(EVENT_TASK_UPDATED, self._handle_task_update)
        )

    async def _handle_task_update(self, event) -> None:
        """Handle task updates to refresh the calendar."""
        self.async_write_ha_state()
