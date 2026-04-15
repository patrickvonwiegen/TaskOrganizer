# TaskOrganizer for Home Assistant

TaskOrganizer is a integration for Home Assistant designed to manage household tasks in a gamified way. It allows you to create tasks with intervals and complexity points, assign them to roommates, and crown a "Roommate of the Month".

<p align="center">
  <img width="24%" alt="image" src="https://github.com/user-attachments/assets/f8fa36ed-233c-4784-99bb-535cfb788205" />
  <img width="24%" alt="image" src="https://github.com/user-attachments/assets/8860eb6b-1b92-436b-bbf1-9908bde8f7ec" />
  <img width="24%" alt="image" src="https://github.com/user-attachments/assets/a63d8081-eb54-4c36-a9de-00c3c6345cf5" />
  <img width="24%" alt="image" src="https://github.com/user-attachments/assets/e1c4ce88-da95-4ff5-a71c-e4e01ae7df13" />
</p>

Suggestions for improvement or bug reports are welcome.

## Features
* **Task Management**: Create, edit, and delete tasks directly from your dashboard.
* **Search Functionality**: Quickly find tasks by name or description using the integrated search bar.
* **One-time & Recurring Tasks**: Supports both recurring tasks with an interval and one-time tasks that are deleted upon completion.
* **Task Templates**: Create and manage templates to quickly add frequently used tasks.
* **Points System**: Each task has a complexity level (1-10); points are shared fairly among all participants upon completion.
* **Pause & Custom Due Date**: Tasks can be paused until a specific date or have their next due date manually set to any chosen date.
* **Task Organization**: Assign tasks to specific areas and give them a unique icon.
* **Task-specific Overdue Thresholds**: Override the global overdue setting for individual tasks.
* **Roommate of the Month**: A podium system visualizes current standings. At the end of the month, points are archived, and a long-term history is maintained.
* **Import & Export**: Secure your data by exporting all tasks to a JSON file or importing them back.
* **Configuration**: Manage global settings, colors, overdue thresholds, and task templates.

## Dashboard Cards
The integration includes four specialized cards for the Lovelace dashboard.

### 1. Household Tasks (`task-organizer-card`)
The main card for viewing and completing tasks.

<img width="381" height="579" alt="image" src="https://github.com/user-attachments/assets/f8fa36ed-233c-4784-99bb-535cfb788205" />


**YAML Configuration:**
```yaml
type: custom:task-organizer-card
title: "Household Tasks" # Custom title for the card (Default: Household Tasks)
sort_by: due_date        # Options: due_date, points, assignee, alphabet (default due_date)
sort_order: desc         # Options: default, asc, desc (default default)
filter_by: none          # Options: see filter options below
items_per_page: 10       # Number of displayed items
show_edit: true          # Shows the task edit symbol (Default true)
show_delete: true        # Shows the task delete symbol (Default true)
show_search: true        # Shows the search icon and bar (Default true)
show_add: true           # Shows the add task button (Default true)
```

#### Available Filters:
 Multiple filters are AND-linked.
 Supports comma-separated lists and negations (!), e.g. "!done, !paused". 
- `current_user`: Tasks assigned to the currently logged-in Home Assistant user.
- `assigned`: Tasks that have at least one assignee.
- `done`: Tasks where the next due date is in the future.
- `due`: Tasks that are due today or in the past, but not yet overdue.
- `overdue`: Tasks that have exceeded their overdue threshold.
- `paused`: Tasks that are currently paused until a specific date. You can use `!paused` to only show active tasks.
- `onetime`: Tasks that do not repeat.

#### Filter Examples:
- `filter_by: "current_user, due"` (Only my due tasks)
- `filter_by: "overdue"` (All overdue tasks)
- `filter_by: "done"` (All completed tasks, where the next due date is in the future)
- `filter_by: "!due, !paused"` (All active tasks except due ones)
- `filter_by: "!assigned, !done"` (All unassigned tasks that are due or overdue)
- `filter_by: "!done, !paused"` (All active tasks that are due or overdue)
- `filter_by: "onetime, !done"` (All pending one-time tasks)

### 2. Roommate of the Month (task-organizer-leaderboard)
Displays the winner's podium and an optional history of previous months.

<img width="488" height="609" alt="image" src="https://github.com/user-attachments/assets/8860eb6b-1b92-436b-bbf1-9908bde8f7ec" />

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

<img width="385" height="713" alt="image" src="https://github.com/user-attachments/assets/e1c4ce88-da95-4ff5-a71c-e4e01ae7df13" />

**YAML Configuration:**
```yaml
type: custom:task-organizer-settings
show_advanced: false    # Unlocks the reset and factory reset area (Default: false)
```

## Sensors
The integration provides the following sensors:

| Sensor | Description |
| :--- | :--- |
| `sensor.task_organizer_all_tasks` | Displays the total number of created tasks. The full task list is available as JSON in the attributes. |
| `sensor.task_organizer_due_tasks` | Displays the number of tasks that are due but not yet overdue. |
| `sensor.task_organizer_overdue_tasks` | Displays the number of overdue tasks. |
| `sensor.task_organizer_due_and_overdue_tasks` | Displays the combined number of due and overdue tasks. |
| `sensor.task_organizer_points` | Shows the current point standings for all users. Perfect for custom visualizations. |
| `sensor.task_organizer_leaderboard` | Displays the name of the roommate currently in the lead. |
| `sensor.task_organizer_templates` | Displays the number of available templates. The full template list is available as JSON in the attributes. |
| `sensor.task_organizer_settings` | Provides the current configuration (colors, overdue thresholds). |

## Buttons
| Button | Description |
| :--- | :--- |
| `button.task_organizer_reset_month`| Triggers the monthly reset (archives points and starts a new period). |
| `button.task_organizer_factory_reset` | Performs a factory reset (deletes all data). |

## Services
TaskOrganizer offers services that can be used in automations or scripts:

### `task_organizer.add_task`
Creates a new recurring or one-time task, optionally from a template.
* **template**: (Optional) The name of a template to use. Fills in other fields if they are not provided.
* **name**: (Optional if template is used) What should the task be called?
* **description**: (Optional) Additional info.
* **area**: (Optional) The area/room where the task applies.
* **interval**: (Optional) How often does it need to be done? `0` for one-time tasks. If not set, taken from template or defaults to `7`.
* **complexity**: (Optional) Points (1-10).
* **icon**: (Optional) An mdi-icon for the task (e.g., `mdi:broom`).
* **assignees**: (Optional) List of user IDs or person entities.
* **override_overdue_days**: (Optional) Overrides the global setting for the number of days after which this task is considered overdue.

### `task_organizer.complete_task_by_name`
Marks a task as completed by its exact name.
* **task_name**: The name of the task.
* **user_id**: (Optional) Who completed the task.

### `task_organizer.set_task_due_by_name`
Marks a task as due immediately by its exact name.
* **task_name**: The name of the task.

### `task_organizer.pause_task_by_name`
Pauses a task until a specific date.
* **task_name**: The name of the task.
* **pause_until**: The date until which the task should be paused (e.g., "2024-12-31").

### `task_organizer.remove_task_by_name`
Removes a task by its exact name.
* **task_name**: The exact name of the task.

### `task_organizer.edit_task_by_name`
Edits an existing task by its exact name.
* **task_name**: The exact name of the task to edit.
* **new_name**: (Optional) The new name for the task.
* **description**: (Optional) Additional info.
* **area**: (Optional) The area/room where the task applies.
* **interval**: (Optional) How often does it need to be done?
* **complexity**: (Optional) Points (1-10).
* **icon**: (Optional) An mdi-icon for the task.
* **assignees**: (Optional) List of user IDs or person entities.
* **override_overdue_days**: (Optional) Overrides the global setting.

### `task_organizer.add_template`
Creates a new template.
* **name**: The name of the template.
* **description**: (Optional) Additional info.
* **area**: (Optional) The area/room where the task applies.
* **interval**: (Optional) How often does it need to be done?
* **complexity**: (Optional) Points (1-10).
* **icon**: (Optional) An mdi-icon for the task.
* **assignees**: (Optional) List of user IDs or person entities.

### `task_organizer.remove_template_by_name`
Removes a template by its exact name.
* **template_name**: The exact name of the template.

### `task_organizer.edit_template_by_name`
Edits an existing template by its exact name.
* **template_name**: The exact name of the template to edit.
* **new_name**: (Optional) The new name for the template.
* **description**: (Optional) Additional info.
* **area**: (Optional) The area/room where the task applies.
* **interval**: (Optional) How often does it need to be done?
* **complexity**: (Optional) Points (1-10).
* **icon**: (Optional) An mdi-icon for the task.
* **assignees**: (Optional) List of user IDs or person entities.

### `task_organizer.reset_monthly_points`
Manually resets all points to 0 and saves the current month to the history.

### `task_organizer.factory_reset`
Deletes all tasks, history, and points, returning the integration to its initial state.

## Events
TaskOrganizer fires custom events to allow for advanced automations.

### task_organizer_task_completed
This event is fired whenever a task is marked as completed. It is useful for triggering notifications or other household automations.

#### Event Data:
- **task_id**: The unique ID of the task.
- **task_name**: The name of the task (e.g., "Take out the trash").
- **completed_by**: A list of user IDs who completed the task.
- **points_per_user**: Points awarded to each participant.
- **total_points**: Total complexity points of the task.

#### Example Automation:
Say "Thank you" via a media player when someone completes a specific task.

```yml
alias: "TaskOrganizer: Thank You Message"
trigger:
  - platform: event
    event_type: "task_organizer_task_completed"
condition:
  - condition: template
    value_template: "{{ trigger.event.data.task_name == 'Take out the trash' }}"
action:
  - service: tts.google_translate_say
    data:
      entity_id: media_player.living_room_speaker
      message: "Thank you for taking out the trash!"
```

### task_organizer_leaderboard_changed
This event is triggered whenever the ranking order within the Top 3 roommates changes. This can happen when a task is completed, points are manually edited, or the month is reset.

#### Event Data:

- **old_leaderboard**: A list of the top 3 users before the change.

- **new_leaderboard**: A list of the top 3 users after the change.

Each list entry contains user_id, name (friendly name), and points.

#### Example Automation:
Celebrate when a roommate takes the lead!

```yml
alias: "TaskOrganizer: New Leader Notification"
trigger:
  - platform: event
    event_type: "task_organizer_leaderboard_changed"
condition:
  # Only trigger if the person in 1st place (index 0) has changed
  - condition: template
    value_template: "{{ trigger.event.data.old_leaderboard[0].user_id != trigger.event.data.new_leaderboard[0].user_id }}"
action:
  - service: notify.mobile_app_your_phone
    data:
      title: "New Ranking Leader!"
      message: >
        {{ trigger.event.data.new_leaderboard[0].name }} just took the lead 
        with {{ trigger.event.data.new_leaderboard[0].points }} points!
```

### task_organizer_task_created
This event is fired whenever a new task is created. It is useful for notifying roommates about new tasks or triggering other automations.

#### Event Data:
- **id**: The unique ID of the newly created task.
- **name**: The name of the task.
- **description**: Additional info about the task.
- **area**: The area/room where the task applies.
- **interval**: The interval of the task in days (0 for one-time tasks).
- **assignees**: A list of user IDs or person entities assigned to the task.
- **complexity**: Points (1-10) for the task.
- **category**: The category of the task.
- **icon**: The mdi-icon for the task.
- **due_date**: The initial due date of the task.
- **paused_until**: Date until the task is paused (if applicable).
- **override_overdue_days**: Custom overdue threshold for the task (if applicable).

#### Example Automation:
Send a notification when a new high-complexity task is created.

```yml
alias: "TaskOrganizer: New High-Complexity Task Notification"
trigger:
  - platform: event
    event_type: "task_organizer_task_created"
condition:
  - condition: template
    value_template: "{{ trigger.event.data.complexity >= 8 }}"
action:
  - service: notify.notify
    data:
      title: "Important New Task!"
      message: "A new difficult task '{{ trigger.event.data.name }}' has been added."
```


## Installation & Data Storage
All data is stored securely in the internal Home Assistant database at .storage/task_organizer.storage.

Colors and overdue thresholds can be defined globally within the settings card.
