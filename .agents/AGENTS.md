# AI Assistant Guidelines for TaskOrganizer

This document provides context and guidelines for the TaskOrganizer Home Assistant integration to guide any AI assistant in making code changes.

## Project Overview

TaskOrganizer is a custom integration for Home Assistant that allows users to manage household tasks in a gamified way. It includes a backend component (Python) and several frontend Lovelace cards (JavaScript).

### Key Files & Directories

*   `custom_components/task_organizer/`: The main directory for the backend integration.
    *   `__init__.py`: The core of the integration. It sets up services, websockets, and coordinates data management.
    *   `sensor.py`, `button.py`: Platform setup for entities.
    *   `const.py`: Contains all constants like domain, event names, service names, and websocket types.
*   **Lovelace Cards (GUI Support)**: 
    * All cards include a `getConfigElement()` method and an associated Editor class (e.g., `TaskOrganizerCardEditor`).
    * GUI editors support configuration of title, filters, sorting, and layout (width/height).
    * Visibility can be restricted via `show_...` parameters in the GUI.
    *   `translations/`: Contains JSON files for internationalization (i18n) of entity names, services, and config flows. `en.json` and `de.json` are the primary languages.
    *   `www/`: Contains the JavaScript files for the frontend Lovelace cards. Each card is a self-contained web component.
*   `README.md`: The main documentation for the project. It should be updated with any new features, services, or configuration options.
*   `CHANGELOG.md`: Tracks all changes made to the project, following a specific versioning logic.

## Frontend Architecture

The frontend (`www/` directory) is built using vanilla JavaScript Web Components (Custom Elements) that render into the Shadow DOM. To ensure reusability, maintainability, and clean code, the architecture strictly separates **Presentational Components (Modals)** from **Container Components (Cards)**.

### 1. Web Component Encapsulation
Every UI element is a standard custom HTML element extending `HTMLElement`. 
- **Cards** (e.g., `<task-organizer-card>`, `<task-organizer-protocol>`) act as the main controllers. They handle data fetching, state management, and direct communication with Home Assistant.
- **Modals** (e.g., `<task-organizer-task-modal>`, `<task-organizer-choice-modal>`) act as decoupled presentational UI views. They handle their own internal rendering, styling, and user input, but **do not** communicate directly with the Home Assistant API.

### 2. Modal Integration and Usage
Modals are stored in `www/modals/` and must be imported into the Cards that need them. 
Once imported, they can be instantiated in the parent card's HTML:
```html
<task-organizer-task-modal id="modal-task"></task-organizer-task-modal>
```

#### The `open(...)` API
Modals expose an `open()` method that accepts the necessary context to render itself (e.g., `taskId`, `tasks`, `hass`, `users`). 
- **Rule:** A modal must be completely agnostic to *which* card opened it. It simply receives data, populates its fields, and displays itself.

### 3. Event-Driven Communication
To maintain the decoupling, data flows down via method calls (like `open()`), and actions flow up via **Custom Events**.

When a user completes an action in a modal (e.g., clicking "Save"), the modal gathers the form data and fires an event:
```javascript
this.dispatchEvent(new CustomEvent('task-saved', { 
    detail: { payload: data, editingTaskId: id }, 
    bubbles: true, 
    composed: true 
}));
```

The parent Card listens to these events and performs the actual API calls:
```javascript
modal.addEventListener('task-saved', (e) => {
    this._hass.callWS({ type: 'task_organizer/edit_task', ...e.detail.payload });
});
```

### 4. Localization (i18n)
Translations are centralized in `www/utils/i18n.js`. This file exports a shared `localize(hass, key, replace)` function.
- Both Cards and Modals use this single source of truth for translations to avoid duplicating translation dictionaries across multiple files.
- For text within Lovelace cards (e.g., labels, buttons, tooltips), update the `I18N_...` object inside `i18n.js` for both English (`en`) and German (`de`).
- For backend-generated names (sensors, services), update both `en.json` and `de.json` in the `custom_components/task_organizer/translations/` directory.
- **Alphabetical Sorting:** Always ensure that new translation entries in `de.js` and `en.js` (and other localization files) are sorted alphanumerically within their respective dictionaries to maintain readability.

## Rules for Code Changes

Please adhere to the following rules for every request:

1.  **English Comments**: 
    * All new or modified functions and classes in the Python and JavaScript code must have clear and concise comments in English explaining their purpose, parameters, and return values.
    * No Inline-Comments for github workflows

2.  **Focused Changes**: Only modify the parts of the code that are directly related to the requested task. If a request is unclear, ask for clarification before proceeding.

3.  **Update Documentation**: For every functional change or new feature, update the following files accordingly:
    *   **`README.md`**: Add or modify the description of features, sensors, services, events, or card configurations.
    *   **`CHANGELOG.md`**: Use the current version of manifest.json and category (`🚀 New Features`, `🐛 Bug Fixes`, `⚠️ Breaking Changes`).

4.  **No Special Characters**: 
    *   Do not use control characters or non-standard special symbols in the text fields (especially in `CHANGELOG.md`).
    *   Specific category emojis (🚀, 🐛, ⚠️) are allowed for structure, but the content must remain clean.

5.  **Versioning Logic**: Follow the `Major.Minor.Bugfix` semantic versioning scheme. 
    *   Consolidate all changes for a feature set or bugfix round into a "Next" section in `CHANGELOG.md`. 
    *   Do not increment the version for every minor code adjustment. Only increment the version when a logical development block is completed.

6.  **Code Quality**:
    *   Keep the code clean and readable.
    *   Break down complex logic into smaller, single-purpose methods or functions.
    *   Follow existing code style and conventions.
