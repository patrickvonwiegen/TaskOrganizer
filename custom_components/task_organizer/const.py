"""Konstanten für die TaskOrganizer Integration."""

# Domain of the integration
DOMAIN = "task_organizer"

# Configuration keys
CONF_NAME = "name"

# Storage Constants
STORAGE_KEY = f"{DOMAIN}.storage"
STORAGE_VERSION = 1

# Default colors for the frontend
DEFAULT_COLOR_DONE = "#4CAF50"     # Green
DEFAULT_COLOR_DUE = "#FFC107"      # Yellow/Orange
DEFAULT_COLOR_OVERDUE = "#F44336"  # Red
DEFAULT_OVERDUE_DAYS = 5

# Event names
EVENT_TASK_UPDATED = "task_organizer_updated"

# WebSocket Command Types
WS_TYPE_GET_DATA = "task_organizer/get_data"
WS_TYPE_COMPLETE_TASK = "task_organizer/complete_task"
WS_TYPE_ADD_TASK = "task_organizer/add_task"
WS_TYPE_EDIT_TASK = "task_organizer/edit_task"
WS_TYPE_DELETE_TASK = "task_organizer/delete_task"
WS_TYPE_PAUSE_TASK = "task_organizer/pause_task"
WS_TYPE_UPDATE_POINTS = "task_organizer/update_points"
WS_TYPE_FACTORY_RESET = "task_organizer/factory_reset"
WS_TYPE_UPDATE_SETTINGS = "task_organizer/update_settings"
WS_TYPE_DELETE_HISTORY_ITEM = "task_organizer/delete_history_item"
WS_TYPE_EDIT_HISTORY_ITEM = "task_organizer/edit_history_item"
WS_TYPE_IMPORT_TASKS = "task_organizer/import_tasks"

# Service Names
SERVICE_RESET_MONTHLY_POINTS = "reset_monthly_points"
SERVICE_COMPLETE_TASK_BY_NAME = "complete_task_by_name"
SERVICE_ADD_TASK = "add_task"
SERVICE_FACTORY_RESET = "factory_reset"