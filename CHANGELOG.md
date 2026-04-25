﻿# Changelog

## [1.5.0]
### 🚀 New Features
- **GUI Configuration Editor:** All Lovelace cards now support the Home Assistant Visual Editor. Parameters can be adjusted via the UI without manual YAML editing.
- **Flexible Point Distribution:** When completing a task with multiple assignees, users can now distribute points flexibly via a slider. If there are more than two assignees, a network diagram is also provided so that the tasks can be easily assigned.

### 🐛 Bug Fixes
- **Consistent Cancel Button Styling**: All "Cancel" buttons across the Lovelace cards now have a consistent style (blue text on a transparent background).

## [1.4.0]
### 🚀 New Features
- **Subtasks:** Tasks can now have subtasks. Added progress indicators, hover-text, and backend support for all relevant services and websocket commands.
- **UI Improvements:** Added a one-time task and subtask indicator icon next to the task name.
- **Area Filtering:** The `task-organizer-card` now supports filtering by area IDs using the `room:` prefix (e.g., `filter_by: "room:kitchen"`). Area filters also support negation (e.g., `!room:kitchen`).

### 🐛 Bug Fixes
- **Timestamps:** Fixed an issue where task completion timestamps in the history were stored as naive datetimes, causing an offset in the UI.
- **Sensors:** Updated due/overdue calculation to use Home Assistant's local time utilities for consistent task tracking.
- **Task-Card:** Changed cursor to help (question mark) when hovering over assignees for better UX.

## [1.3.0]
### ⚠️ Breaking Changes
- **task-organizer-card:** The `filter_by` configuration logic has been completely rewritten. It now supports multiple comma-separated filters and negations (e.g., `!due, !paused`). All applied filters are combined with a logical AND.
- The `active`, `due_and_overdue`, `inactive`, and `unassigned` filter options have been **removed**. If you used them in your Lovelace dashboard cards, you **must update** your configuration:
  - Replace `active` with `filter_by: "!paused"`.
  - Replace `due_and_overdue` with `filter_by: "!done, !paused"`.
  - Replace `inactive` with `filter_by: "paused"`.
  - Replace `unassigned` with `filter_by: "!assigned"`.

### 🚀 New Features
- New event `task_organizer_task_created` that is fired when a new task is created
- **task-organizer-card:** Added new `done`, `assigned`, `paused`, and `onetime` filter options.
- Added new services: `remove_task_by_name`, `edit_task_by_name`, `add_template`, `remove_template_by_name`, and `edit_template_by_name`.

### 🐛 Bug Fixes
- Dynamic and redesigned leaderboard

## [1.2.0]
### ⚠️ Breaking Changes
- Sensor `task_organizer_due_tasks` transfered into new sensor `task_organizer_due_and_overdue_tasks`

### 🚀 New Features
- Added yml configuration `show_add` and `show_edit` to `task-organizer-card`
- Possibility to set a specific due date
- Added area for task
- Task specific overdue threshold
- Added support for one-time tasks
- Added a template system to quickly create tasks
- service `task_organizer.create_task` now with template support
- New sensor `sensor.task_organizer_templates` to track available templates
- New sensors for differenciation  `task_organizer_due_tasks` and `task_organizer_overdue_tasks`
- New service `task_organizer.set_task_due_by_name` to set a task as due immediately.
- New service `task_organizer.pause_task_by_name` to pause a task until a specific date.

### 🐛 Bug Fixes
- All tooltips in the cards have been translated
- All cards now have a customizable title
- Design adapted to home assistant
- Replaced browser alerts with Home Assistant toast notifications for better user experience

## [1.1.0]
### 🚀 New Features
- Icon added
- Options flow (Integration Konfiguration) added
- Reset buttons added
- Reset services added
- Search for `task-organizer-card` added
- New events `task_organizer_task_completed` and `task_organizer_leaderboard_changed`

### 🐛 Bug Fixes
- Display options for task organizer card adjusted
