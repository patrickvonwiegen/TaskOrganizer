"""Initialization of the TaskOrganizer integration."""

import logging
import time
import uuid
from datetime import datetime, timedelta

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.storage import Store

from .const import (
    DOMAIN,
    EVENT_TASK_UPDATED,
    EVENT_LEADERBOARD_CHANGED,
    EVENT_TASK_COMPLETED,
    STORAGE_KEY,
    STORAGE_VERSION,
    WS_TYPE_ADD_TASK,
    WS_TYPE_COMPLETE_TASK,
    WS_TYPE_DELETE_HISTORY_ITEM,
    WS_TYPE_DELETE_TASK,
    WS_TYPE_EDIT_HISTORY_ITEM,
    WS_TYPE_EDIT_TASK,
    WS_TYPE_FACTORY_RESET,
    WS_TYPE_GET_DATA,
    WS_TYPE_IMPORT_TASKS,
    WS_TYPE_PAUSE_TASK,
    WS_TYPE_UPDATE_POINTS,
    WS_TYPE_UPDATE_SETTINGS,
    SERVICE_ADD_TASK,
    SERVICE_COMPLETE_TASK_BY_NAME,
    SERVICE_RESET_MONTHLY_POINTS,
    SERVICE_FACTORY_RESET,
)

# Global logger for the integration
_LOGGER = logging.getLogger(__name__)

# Supported platforms
PLATFORMS = ["sensor", "button"]


async def update_listener(hass: HomeAssistant, entry: ConfigEntry):
    """Called when options are changed via the UI gear icon."""
    # Update the settings in the main data structure
    hass.data[DOMAIN]["data"]["settings"] = dict(entry.options)

    hass.bus.async_fire(EVENT_TASK_UPDATED)


def _calculate_points_per_user(total_points: float, user_count: int) -> float:
    """
    Calculate the fair share of points per user.
    
    :param total_points: The total complexity/points of the task.
    :param user_count: The amount of users that completed the task.
    :return: The rounded points per user.
    """
    if user_count <= 0:
        return 0.0
    return round(total_points / user_count, 1)


def _get_user_id(hass: HomeAssistant, target: str) -> str | None:
    """
    Resolve a user ID from a given string target (which might be an entity_id).
    
    :param hass: The Home Assistant instance.
    :param target: The input string (entity_id or user_id).
    :return: The resolved user ID or the initial string if not an entity.
    """
    if not target:
        return None
        
    if target.startswith("person."):
        state = hass.states.get(target)
        if state and state.attributes.get("user_id"):
            return state.attributes.get("user_id")
            
    return target


def _fire_leaderboard_event_if_changed(hass: HomeAssistant, old_points: dict, new_points: dict):
    """
    Compares the old and new points. Fires an event if the top 3 user order changes.
    """
    # Sort by points (descending) and then by user_id (ascending) for stable tie-breaking
    old_sorted = sorted(old_points.items(), key=lambda item: (-item[1], item[0]))
    new_sorted = sorted(new_points.items(), key=lambda item: (-item[1], item[0]))
    
    # Get top 3
    old_top_3 = [{"user_id": uid, "points": pts} for uid, pts in old_sorted[:3]]
    new_top_3 = [{"user_id": uid, "points": pts} for uid, pts in new_sorted[:3]]
    
    # Check if the order of user_ids changed in the top 3
    old_order = [item["user_id"] for item in old_top_3]
    new_order = [item["user_id"] for item in new_top_3]
    
    if old_order != new_order:
        # Resolve friendly names for a better event payload experience
        for item in old_top_3 + new_top_3:
            name = item["user_id"]
            for state in hass.states.async_all("person"):
                if state.attributes.get("user_id") == item["user_id"]:
                    name = state.attributes.get("friendly_name", item["user_id"])
                    break
            item["name"] = name
            
        hass.bus.async_fire(EVENT_LEADERBOARD_CHANGED, {
            "old_leaderboard": old_top_3,
            "new_leaderboard": new_top_3,
        })


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_GET_DATA})
@websocket_api.async_response
async def ws_get_data(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    """
    Handle the websocket request to get all task organizer data.
    
    :param hass: The Home Assistant instance.
    :param connection: The active websocket connection.
    :param msg: The incoming message payload.
    """
    data = hass.data[DOMAIN]["data"]
    
    # Get options from ConfigEntry and inject as 'settings'
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    
    # Create a copy to avoid accidentally modifying the original dictionary
    response_data = dict(data)
    response_data["settings"] = dict(entry.options)
    
    connection.send_result(msg["id"], response_data)


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_COMPLETE_TASK,
    vol.Required("task_id"): str,
    vol.Optional("completed_by"): cv.ensure_list,
})
@websocket_api.async_response
async def ws_complete_task(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    """
    Mark a specific task as completed via websocket.
    
    :param hass: The Home Assistant instance.
    :param connection: The active websocket connection.
    :param msg: The incoming message payload containing task_id and optionally completed_by.
    """
    data = hass.data[DOMAIN]["data"]
    task_id = msg["task_id"]
    completed_by = msg.get("completed_by")
    
    if not completed_by:
        completed_by = [connection.user.id]

    if task_id not in data["tasks"]:
        connection.send_error(msg["id"], "not_found", "Task not found")
        return

    task = data["tasks"][task_id]
    total_points = float(task.get("complexity", 1))
    points_per_user = _calculate_points_per_user(total_points, len(completed_by))
    
    old_points = data["points"].copy()
    
    for u_id in completed_by:
        if u_id not in data["points"]:
            data["points"][u_id] = 0
            
        data["points"][u_id] += points_per_user
        
        history_entry = {
            "id": str(uuid.uuid4()),
            "task_id": task_id,
            "task_name": task.get("name", "Unknown task"),
            "user_id": u_id,
            "points": points_per_user,
            "timestamp": datetime.now().isoformat()
        }
        data["history"].insert(0, history_entry)
    
    interval = task.get("interval", 1)
    task["due_date"] = (datetime.now() + timedelta(days=interval)).isoformat()
    task["paused_until"] = None 
    
    # Trigger events
    _fire_leaderboard_event_if_changed(hass, old_points, data["points"])
    hass.bus.async_fire(EVENT_TASK_COMPLETED, {
        "task_id": task_id,
        "task_name": task.get("name"),
        "completed_by": completed_by,
        "points_per_user": points_per_user,
        "total_points": total_points
    })
    
    await hass.data[DOMAIN]["store"].async_save(data)
    hass.bus.async_fire(EVENT_TASK_UPDATED)
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_ADD_TASK,
    vol.Required("name"): str, 
    vol.Optional("description", default=""): str,
    vol.Optional("area", default=""): str,
    vol.Required("interval"): int,
    vol.Optional("assignees"): cv.ensure_list,
    vol.Required("complexity"): vol.All(int, vol.Range(min=1, max=10)),
    vol.Required("category"): str, 
    vol.Required("icon"): str,
    vol.Optional("custom_due_date"): vol.Any(str, None),
    vol.Optional("paused_until"): vol.Any(str, None),
    vol.Optional("override_overdue_days"): vol.Any(vol.All(int, vol.Range(min=0, max=9999)), None),
})
@websocket_api.async_response
async def ws_add_task(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    """
    Create a new task via websocket.
    
    :param hass: The Home Assistant instance.
    :param connection: The active websocket connection.
    :param msg: The incoming message payload with task details.
    """
    data = hass.data[DOMAIN]["data"]
    task_id = str(uuid.uuid4())
    custom_due_date_str = msg.get("custom_due_date")
    if custom_due_date_str:
        due_date = datetime.fromisoformat(custom_due_date_str).isoformat()
    else:
        due_date = datetime.now().isoformat() # Default if no custom date is provided
    
    new_task = {
        "id": task_id, 
        "name": msg["name"], 
        "description": msg.get("description", ""),
        "area": msg.get("area", ""),
        "interval": msg["interval"],
        "assignees": msg.get("assignees", []), 
        "complexity": msg["complexity"],
        "category": msg["category"], 
        "icon": msg["icon"],
        "due_date": due_date, 
        "paused_until": msg.get("paused_until"),
        "override_overdue_days": msg.get("override_overdue_days")
    }
    
    data["tasks"][task_id] = new_task
    await hass.data[DOMAIN]["store"].async_save(data)
    hass.bus.async_fire(EVENT_TASK_UPDATED)
    connection.send_result(msg["id"], {"success": True, "task_id": task_id})


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_EDIT_TASK,
    vol.Required("task_id"): str, 
    vol.Optional("name"): str,
    vol.Optional("description"): str,
    vol.Optional("area"): str,
    vol.Optional("interval"): int, 
    vol.Optional("assignees"): cv.ensure_list,
    vol.Optional("complexity"): vol.All(int, vol.Range(min=1, max=10)),
    vol.Optional("category"): str, 
    vol.Optional("icon"): str,
    vol.Optional("custom_due_date"): vol.Any(str, None),
    vol.Optional("paused_until"): vol.Any(str, None),
    vol.Optional("override_overdue_days"): vol.Any(vol.All(int, vol.Range(min=0, max=9999)), None),
})
@websocket_api.async_response
async def ws_edit_task(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    """
    Edit an existing task via websocket.
    
    :param hass: The Home Assistant instance.
    :param connection: The active websocket connection.
    :param msg: The incoming message payload with updated task details.
    """
    data = hass.data[DOMAIN]["data"]
    task_id = msg["task_id"]
    
    if task_id not in data["tasks"]:
        connection.send_error(msg["id"], "not_found", "Task not found")
        return
        
    task_ref = data["tasks"][task_id]
    keys_to_update = ["name", "description", "area", "interval", "assignees", "complexity", "category", "icon"]
    
    for key in keys_to_update:
        if key in msg: 
            task_ref[key] = msg[key]

    if msg.get("custom_due_date"):
        task_ref["due_date"] = datetime.fromisoformat(msg["custom_due_date"]).isoformat()
        
    if "paused_until" in msg:
        task_ref["paused_until"] = msg["paused_until"]

    if "override_overdue_days" in msg:
        task_ref["override_overdue_days"] = msg["override_overdue_days"]
        
    await hass.data[DOMAIN]["store"].async_save(data)
    hass.bus.async_fire(EVENT_TASK_UPDATED)
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_DELETE_TASK,
    vol.Required("task_id"): str,
})
@websocket_api.async_response
async def ws_delete_task(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    """
    Delete a task via websocket.
    
    :param hass: The Home Assistant instance.
    :param connection: The active websocket connection.
    :param msg: The incoming message payload with task_id.
    """
    data = hass.data[DOMAIN]["data"]
    task_id = msg["task_id"]
    
    if task_id in data["tasks"]:
        del data["tasks"][task_id]
        await hass.data[DOMAIN]["store"].async_save(data)
        hass.bus.async_fire(EVENT_TASK_UPDATED)
        connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_FACTORY_RESET,
})
@websocket_api.async_response
async def ws_factory_reset(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    """
    Perform a complete factory reset of the integration data.
    
    :param hass: The Home Assistant instance.
    :param connection: The active websocket connection.
    :param msg: The incoming message payload.
    """
    await hass.services.async_call(DOMAIN, SERVICE_FACTORY_RESET)
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_UPDATE_SETTINGS,
    vol.Required("settings"): dict,
})
@websocket_api.async_response
async def ws_update_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    """Saves the settings from the card directly into the Home Assistant OptionsFlow."""
    entry = hass.config_entries.async_entries(DOMAIN)[0]
    
    # Update the Entry-Options with the new settings from the card
    new_options = dict(entry.options)
    new_options.update(msg["settings"])
    
    hass.config_entries.async_update_entry(entry, options=new_options)
    # The update event is triggered automatically by the update_listener
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_DELETE_HISTORY_ITEM,
    vol.Required("entry_id"): str,
})
@websocket_api.async_response
async def ws_delete_history_item(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    data = hass.data[DOMAIN]["data"]
    entry_id = msg["entry_id"]
    
    history = data["history"]
    entry_to_delete = next((item for item in history if item["id"] == entry_id), None)
    
    if entry_to_delete:
        old_points = data["points"].copy()
        u_id = entry_to_delete["user_id"]
        pts = float(entry_to_delete.get("points", 0))
        
        if u_id in data["points"]:
            data["points"][u_id] = max(0.0, float(data["points"][u_id]) - pts)
            
        data["history"] = [item for item in history if item["id"] != entry_id]
        
        _fire_leaderboard_event_if_changed(hass, old_points, data["points"])
        
        await hass.data[DOMAIN]["store"].async_save(data)
        hass.bus.async_fire(EVENT_TASK_UPDATED)
    
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_EDIT_HISTORY_ITEM,
    vol.Required("entry_id"): str,
    vol.Required("points"): vol.Coerce(float),
    vol.Required("user_id"): str,
})
@websocket_api.async_response
async def ws_edit_history_item(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    data = hass.data[DOMAIN]["data"]
    entry_id = msg["entry_id"]
    new_points = msg["points"]
    new_user_id = msg["user_id"]
    
    history = data["history"]
    entry = next((item for item in history if item["id"] == entry_id), None)
    
    if entry:
        old_all_points = data["points"].copy()
        
        old_u_id = entry["user_id"]
        old_pts = float(entry.get("points", 0))
        
        if old_u_id in data["points"]:
            data["points"][old_u_id] = max(0.0, float(data["points"][old_u_id]) - old_pts)
            
        if new_user_id not in data["points"]:
            data["points"][new_user_id] = 0.0
        data["points"][new_user_id] += new_points
        
        entry["user_id"] = new_user_id
        entry["points"] = new_points
        
        _fire_leaderboard_event_if_changed(hass, old_all_points, data["points"])
        
        await hass.data[DOMAIN]["store"].async_save(data)
        hass.bus.async_fire(EVENT_TASK_UPDATED)
        
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_IMPORT_TASKS,
    vol.Required("tasks"): dict,
})
@websocket_api.async_response
async def ws_import_tasks(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict):
    data = hass.data[DOMAIN]["data"]
    imported = msg["tasks"]
    for tid, tdata in imported.items():
        data["tasks"][tid] = tdata
    await hass.data[DOMAIN]["store"].async_save(data)
    hass.bus.async_fire(EVENT_TASK_UPDATED)
    connection.send_result(msg["id"], {"success": True})


async def _async_check_monthly_reset(hass: HomeAssistant, force: bool = False):
    """
    Check if a new month has started and perform the points reset.
    
    :param hass: The Home Assistant instance.
    :param force: If True, forces the reset regardless of the current month.
    """
    data = hass.data[DOMAIN]["data"]
    store = hass.data[DOMAIN]["store"]
    current_actual_month = datetime.now().strftime("%Y-%m")
    saved_month = data.get("current_month")
    
    if saved_month != current_actual_month or force:
        old_points = data["points"].copy()
        
        if saved_month: 
            data["monthly_history"][saved_month] = data["points"].copy()
            
        for user in data["points"]: 
            data["points"][user] = 0
            
        data["current_month"] = current_actual_month
        data["current_period_start"] = datetime.now().isoformat()
        
        _fire_leaderboard_event_if_changed(hass, old_points, data["points"])
        
        await store.async_save(data)
        hass.bus.async_fire(EVENT_TASK_UPDATED)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """
    Set up the TaskOrganizer integration from a config entry.
    
    :param hass: The Home Assistant instance.
    :param entry: The configuration entry to setup.
    :return: Boolean indicating successful setup.
    """
    hass.data.setdefault(DOMAIN, {})
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    data = await store.async_load()
    
    if data is None:
        data = {
            "tasks": {}, "points": {}, "history": [], "settings": {}, 
            "monthly_history": {}, "current_month": datetime.now().strftime("%Y-%m"), 
            "current_period_start": datetime.now().replace(day=1, hour=0, minute=0, second=0).isoformat()
        }
    
    # Ensure all required keys exist
    data.setdefault("monthly_history", {})
    data.setdefault("current_month", datetime.now().strftime("%Y-%m"))
    data.setdefault("current_period_start", datetime.now().replace(day=1, hour=0, minute=0, second=0).isoformat())

    # IMPORTANT: Ensure settings from config entry options are always reflected in data
    data["settings"] = dict(entry.options)

    hass.data[DOMAIN]["store"] = store
    hass.data[DOMAIN]["data"] = data

    # Register listener for the OptionsFlow (gear icon)
    entry.async_on_unload(entry.add_update_listener(update_listener))

    # Perform initial check on startup
    await _async_check_monthly_reset(hass)

    async def _timer_check(now):
        """Timer callback to check for month boundaries."""
        await _async_check_monthly_reset(hass)

    # Schedule daily check shortly after midnight
    async_track_time_change(hass, _timer_check, hour=0, minute=1, second=0)

    # ---------------- SERVICES ----------------

    async def handle_manual_reset(call: ServiceCall): 
        """Service handle to force reset monthly points."""
        await _async_check_monthly_reset(hass, force=True)

    async def handle_factory_reset(call: ServiceCall):
        """Service handle to perform a factory reset."""
        old_points = hass.data[DOMAIN]["data"].get("points", {}).copy()
        
        new_data = {
            "tasks": {}, "points": {}, "history": [], "settings": {}, 
            "monthly_history": {}, "current_month": datetime.now().strftime("%Y-%m"), 
            "current_period_start": datetime.now().isoformat()
        }
        hass.data[DOMAIN]["data"] = new_data
        
        _fire_leaderboard_event_if_changed(hass, old_points, new_data["points"])
        
        await store.async_save(new_data)
        hass.bus.async_fire(EVENT_TASK_UPDATED)
        
    async def handle_complete_task_by_name(call: ServiceCall):
        """Service handle to complete a task by its string name."""
        task_name = call.data.get("task_name")
        user_input = call.data.get("user_id")
        target_uid = _get_user_id(hass, user_input) if user_input else call.context.user_id
        
        target_task_id = next(
            (tid for tid, t in data["tasks"].items() if t["name"].lower() == task_name.lower()), 
            None
        )
                
        if not target_task_id:
            _LOGGER.warning("Task '%s' not found.", task_name)
            return
            
        task = data["tasks"][target_task_id]
        completed_by = [target_uid] if target_uid else task.get("assignees", [])
        
        if not completed_by: 
            return
            
        total_points = float(task.get("complexity", 1))
        points_per_user = _calculate_points_per_user(total_points, len(completed_by))
        
        old_points = data["points"].copy()
        
        for u_id in completed_by:
            if u_id not in data["points"]: 
                data["points"][u_id] = 0
            data["points"][u_id] += points_per_user
            
            history_entry = {
                "id": str(uuid.uuid4()), 
                "task_id": target_task_id,
                "task_name": task.get("name", "Unknown task"),
                "user_id": u_id, 
                "points": points_per_user,
                "timestamp": datetime.now().isoformat()
            }
            data["history"].insert(0, history_entry)
        
        interval = task.get("interval", 1)
        task["due_date"] = (datetime.now() + timedelta(days=interval)).isoformat()
        task["paused_until"] = None 
        
        # Trigger events
        _fire_leaderboard_event_if_changed(hass, old_points, data["points"])
        hass.bus.async_fire(EVENT_TASK_COMPLETED, {
            "task_id": target_task_id,
            "task_name": task.get("name"),
            "completed_by": completed_by,
            "points_per_user": points_per_user,
            "total_points": total_points
        })
        
        await store.async_save(data)
        hass.bus.async_fire(EVENT_TASK_UPDATED)

    async def handle_add_task(call: ServiceCall):
        """Service handle to add a new task from an automation."""
        assignees_input = call.data.get("assignees", [])
        if isinstance(assignees_input, str):
            assignees_input = [x.strip() for x in assignees_input.split(",")]
            
        assignees = []
        for assignee in assignees_input:
            uid = _get_user_id(hass, assignee)
            if uid: 
                assignees.append(uid)
            
        if not assignees and call.context.user_id:
            assignees = [call.context.user_id]
            
        task_id = str(uuid.uuid4())
        data["tasks"][task_id] = {
            "id": task_id, 
            "name": call.data.get("name", "New task"),
            "description": call.data.get("description", ""),
            "area": call.data.get("area", ""),
            "interval": call.data.get("interval", 7),
            "assignees": assignees,
            "complexity": call.data.get("complexity", 5),
            "category": "General",
            "icon": call.data.get("icon", "mdi:broom"),
            "due_date": datetime.now().isoformat(), 
            "paused_until": None,
            "override_overdue_days": call.data.get("override_overdue_days")
        }
        await store.async_save(data)
        hass.bus.async_fire(EVENT_TASK_UPDATED)

    # Register services
    hass.services.async_register(DOMAIN, SERVICE_RESET_MONTHLY_POINTS, handle_manual_reset)
    hass.services.async_register(DOMAIN, SERVICE_FACTORY_RESET, handle_factory_reset)
    hass.services.async_register(DOMAIN, SERVICE_COMPLETE_TASK_BY_NAME, handle_complete_task_by_name)
    hass.services.async_register(DOMAIN, SERVICE_ADD_TASK, handle_add_task)
    
    # Register websocket API commands
    websocket_api.async_register_command(hass, ws_get_data)
    websocket_api.async_register_command(hass, ws_complete_task)
    websocket_api.async_register_command(hass, ws_add_task)
    websocket_api.async_register_command(hass, ws_edit_task)
    websocket_api.async_register_command(hass, ws_delete_task)
    websocket_api.async_register_command(hass, ws_factory_reset)
    websocket_api.async_register_command(hass, ws_update_settings)
    websocket_api.async_register_command(hass, ws_delete_history_item)
    websocket_api.async_register_command(hass, ws_edit_history_item)
    websocket_api.async_register_command(hass, ws_import_tasks)
    
    # Register static path for frontend cards
    frontend_path = hass.config.path(f"custom_components/{DOMAIN}/www")
    await hass.http.async_register_static_paths([
        StaticPathConfig("/task_organizer_frontend", frontend_path, False)
    ])

    async def register_lovelace_resources(event=None):
        """Register the custom cards in Lovelace resources."""
        lovelace = hass.data.get("lovelace")
        if not lovelace: 
            return
            
        resources = getattr(lovelace, "resources", None) or lovelace.get("resources")
        if not resources: 
            return
            
        if not resources.loaded: 
            await resources.async_load()
        
        cache_buster = f"{entry.version}_{int(time.time())}"
        base_path = "/task_organizer_frontend"
        needed_cards = [
            f"{base_path}/task-organizer-card.js", 
            f"{base_path}/task-organizer-leaderboard.js", 
            f"{base_path}/task-organizer-stats.js", 
            f"{base_path}/task-organizer-settings.js"
        ]
        
        current_resources = {
            (item.get("url") if isinstance(item, dict) else getattr(item, "url", None)): 
            (item.get("id") if isinstance(item, dict) else getattr(item, "id", None)) 
            for item in resources.async_items()
        }
        
        for card_base_url in needed_cards:
            versioned_url = f"{card_base_url}?v={cache_buster}"
            for url, res_id in list(current_resources.items()):
                if url and url.startswith(card_base_url): 
                    await resources.async_delete_item(res_id)
            await resources.async_create_item({"res_type": "module", "url": versioned_url})

    if hass.is_running: 
        hass.async_create_task(register_lovelace_resources())
    else: 
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, register_lovelace_resources)
    
    # Initialize sensors and buttons
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """
    Unload the TaskOrganizer config entry.
    
    :param hass: The Home Assistant instance.
    :param entry: The configuration entry to unload.
    :return: Boolean indicating successful unload.
    """
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data.pop(DOMAIN)
    return unload_ok