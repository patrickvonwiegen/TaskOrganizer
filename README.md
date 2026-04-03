# TaskOrganizer for Home Assistant

TaskOrganizer is a integration for Home Assistant designed to manage household tasks in a gamified way. It allows you to create tasks with intervals and complexity points, assign them to roommates, and crown a "Roommate of the Month".

Currently still in testing. Suggestions for improvement or bug reports are welcome.

## Features
* **Task Management**: Create, edit, and delete tasks directly from your dashboard.
* **Search Functionality**: Quickly find tasks by name or description using the integrated search bar.
* **Dynamic Due Dates**: Tasks are automatically rescheduled based on their defined interval after completion.
* **Points System**: Each task has a complexity level (1-10); points are shared fairly among all participants upon completion.
* **Pause & Custom Due Date**: Tasks can be paused until a specific date or have their next due date manually set to any chosen date.
* **Roommate of the Month**: A podium system visualizes current standings. At the end of the month, points are archived, and a long-term history is maintained.
* **Import & Export**: Secure your data by exporting all tasks to a JSON file or importing them back.
* **Configuration**: Manage global settings like colors and overdue thresholds

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
| `sensor.task_organizer_settings` | Provides the current configuration (colors, overdue thresholds). |

## Buttons
| Button | Description |
| :--- | :--- |
| `button.task_organizer_reset_month`| Triggers the monthly reset (archives points and starts a new period). |
| `button.task_organizer_factory_reset` | Performs a factory reset (deletes all data). |

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

### `task_organizer.factory_reset`
Deletes all tasks, history, and points, returning the integration to its initial state.

# Events
TaskOrganizer fires custom events to allow for advanced automations.

## task_organizer_task_completed
This event is fired whenever a task is marked as completed. It is useful for triggering notifications or other household automations.

### Event Data:
- **task_id**: The unique ID of the task.
- **task_name**: The name of the task (e.g., "Take out the trash").
- **completed_by**: A list of user IDs who completed the task.
- **points_per_user**: Points awarded to each participant.
- **total_points**: Total complexity points of the task.

### Example Automation:
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

## task_organizer_leaderboard_changed
This event is triggered whenever the ranking order within the Top 3 roommates changes. This can happen when a task is completed, points are manually edited, or the month is reset.

### Event Data:

- **old_leaderboard**: A list of the top 3 users before the change.

- **new_leaderboard**: A list of the top 3 users after the change.

Each list entry contains user_id, name (friendly name), and points.

### Example Automation:
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
filter_by: none          # Options: none, current_user, due, overdue, due_and_overdue, active, inactive, unassigned (default none)
items_per_page: 10       # Number of displayed items
show_edit: true          # Shows the task edit symbol (Default true)
show_delete: true        # Shows the task delete symbol (Default true)
show_search: true        # Shows the search icon and bar (Default true)
show_add: true           # Shows the add task button (Default true)
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
