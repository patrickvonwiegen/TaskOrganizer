# Gemini Code Assist Context for TaskOrganizer

This document provides context for the TaskOrganizer Home Assistant integration to guide Gemini Code Assist in making code changes.

## Project Overview

TaskOrganizer is a custom integration for Home Assistant that allows users to manage household tasks in a gamified way. It includes a backend component (Python) and several frontend Lovelace cards (JavaScript).

### Key Files & Directories

*   `custom_components/task_organizer/`: The main directory for the backend integration.
    *   `__init__.py`: The core of the integration. It sets up services, websockets, and coordinates data management.
    *   `sensor.py`, `button.py`: Platform setup for entities.
    *   `const.py`: Contains all constants like domain, event names, service names, and websocket types.
    *   `translations/`: Contains JSON files for internationalization (i18n) of entity names, services, and config flows. `en.json` and `de.json` are the primary languages.
    *   `www/`: Contains the JavaScript files for the frontend Lovelace cards. Each card is a self-contained web component.
*   `README.md`: The main documentation for the project. It should be updated with any new features, services, or configuration options.
*   `CHANGELOG.md`: Tracks all changes made to the project, following a specific versioning logic.

## Rules for Code Changes

Please adhere to the following rules for every request:

1.  **English Comments**: All new or modified functions and classes in the Python and JavaScript code must have clear and concise comments in English explaining their purpose, parameters, and return values.

2.  **Focused Changes**: Only modify the parts of the code that are directly related to the user's request. If a request is unclear, ask for clarification before proceeding.

3.  **Update Documentation**: For every functional change or new feature, update the following files accordingly:
    *   **`README.md`**: Add or modify the description of features, sensors, services, events, or card configurations.
    *   **`CHANGELOG.md`**: Add a new entry under the appropriate version and category (`🚀 New Features`, `🐛 Bug Fixes`, `⚠️ Breaking Changes`).

4.  **Versioning Logic**: Follow the `Major.Minor.Bugfix` semantic versioning scheme:
    *   **Major (e.g., 2.0.0)**: For incompatible API changes.
    *   **Minor (e.g., 1.3.0)**: For adding functionality in a backward-compatible manner.
    *   **Bugfix (e.g., 1.2.1)**: For backward-compatible bug fixes.

5.  **Code Quality**:
    *   Keep the code clean and readable.
    *   Break down complex logic into smaller, single-purpose methods or functions.
    *   Follow existing code style and conventions.

6.  **Translations**:
    *   For any user-facing text that is added or changed, the corresponding translations must be set.
    *   For text within Lovelace cards (e.g., labels, buttons, tooltips), update the `I18N_...` object at the top of the respective JavaScript file (e.g., `task-organizer-card.js`).
    *   For backend-generated names (sensors, services), update the files in the `custom_components/task_organizer/translations/` directory.

By following these guidelines, you will help maintain the quality, consistency, and documentation of the TaskOrganizer project.
