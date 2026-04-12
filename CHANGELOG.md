﻿# Changelog

## [1.2.1] - 2024-04-12
### 🚀 New Features
- New event `task_organizer_task_created` that is fired when a new task is created

### 🐛 Bug Fixes
- Dynamic and redesigned leaderboard

## [1.2.0] - 2024-04-12
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

## [1.1.0] - 2024-03-30
### 🚀 New Features
- Icon added
- Options flow (Integration Konfiguration) added
- Reset buttons added
- Reset services added
- Search for `task-organizer-card` added
- New events `task_organizer_task_completed` and `task_organizer_leaderboard_changed`

### 🐛 Bug Fixes
- Display options for task organizer card adjusted
