# TaskOrganizer for Home Assistant

TaskOrganizer is a integration for Home Assistant designed to manage household tasks in a gamified way. It allows you to create tasks with intervals and complexity points, assign them to roommates, and crown a "Roommate of the Month".

Currently still in testing. Suggestions for improvement or bug reports are welcome.

## Features
* **Task Management**: Create, edit, and delete tasks directly from your dashboard.
* **Dynamic Due Dates**: Tasks are automatically rescheduled based on their defined interval after completion.
* **Points System**: Each task has a complexity level (1-10); points are shared fairly among all participants upon completion.
* **Pause & Immediate Due**: Tasks can be paused until a specific date or manually set to "due today".
* **Roommate of the Month**: A podium system visualizes current standings. At the end of the month, points are archived, and a long-term history is maintained.
* **Import & Export**: Secure your data by exporting all tasks to a JSON file or importing them back.

## Sensors
The integration provides the following sensors:

| Sensor | Description |
| :--- | :--- |
| `sensor.all_tasks` | Displays the total number of created tasks. The full task list is available as JSON in the attributes. |
| `sensor.due_tasks` | Displays the number of tasks that are due today or overdue. |
| `sensor.points` | Shows the current point standings for all users. Perfect for custom visualizations. |
| `sensor.leaderboard` | Displays the name of the roommate currently in the lead. |
| `sensor.settings` | Provides the current configuration (colors, overdue thresholds). |

## Services
TaskOrganizer offers services that can be used in automations or scripts:

### `task_organizer.add_task`
Creates a new task.
* **name**: Name of the task.
* **interval**: Interval in days.
* **complexity**: Points (1-10).
* **assignees**: (Optional) List of user IDs.

### `task_organizer.complete_task_by_name`
Marks a task as completed by its exact name.
* **task_name**: The name of the task.
* **user_id**: (Optional) Who completed the task.

### `task_organizer.reset_monthly_points`
Manually resets all points to 0 and saves the current month to the history.

## Dashboard Cards
The integration includes four specialized cards for the Lovelace dashboard.

### 1. Household Tasks (`task-organizer-card`)
The main card for viewing and completing tasks.

<img width="383" height="547" alt="image" src="https://github.com/user-attachments/assets/c33fdd31-6d33-4bfb-b41a-c167a36334b8" />

**YAML Configuration:**
```yaml
type: custom:task-organizer-card
title: "My Tasks"
sort_by: due_date       # Options: due_date, points, assignee, alphabet (default due_date)
sort_order: desc        # Options: default, asc, desc (default default)
filter_by: none         # Options: none, current_user, due, overdue, due_and_overdue, active, inactive, unassigned (default none)
items_per_page: 10      # Number of displayed items
hide_delete: false      # Hides the task delete symbol (Default false)
```

### 2. Roommate of the Month (task-organizer-leaderboard)
Displays the winner's podium and an optional history of previous months.

<img width="388" height="228" alt="image" src="https://github.com/user-attachments/assets/288496e5-29f7-47c4-9430-b9baab65e9d3" />

**YAML Configuration:**
```yaml
type: custom:task-organizer-leaderboard
show_history: true      # Displays the table of previous winners (default: true)
```

### 3. Household Log (task-organizer-stats)
A list of recently completed tasks with the option to correct or delete entries.

<img width="383" height="354" alt="image" src="https://github.com/user-attachments/assets/a63d8081-eb54-4c36-a9de-00c3c6345cf5" />

**YAML Configuration:**
```yaml
type: custom:task-organizer-stats
title: "Who did what?"
filter_by: all      # Options: all, mine (Default all)
items_per_page: 10  # Number of displayed items
```
### 4. Settings (task-organizer-settings)
Allows customization of colors, data export, and factory resets.

<img width="385" height="327" alt="image" src="https://github.com/user-attachments/assets/be06b2cc-7153-4229-b9f9-986e03d836bd" />

**YAML Configuration:**
```yaml
type: custom:task-organizer-settings
show_advanced: false    # Unlocks the reset and factory reset area (Default: false)
```

## Installation & Data Storage
All data is stored securely in the internal Home Assistant database at .storage/task_organizer.storage.

Colors and overdue thresholds can be defined globally within the settings card.
