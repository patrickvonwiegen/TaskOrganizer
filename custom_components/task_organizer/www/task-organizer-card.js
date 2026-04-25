/**
 * Configuration for translations.
 * en: English translations.
 * de: German translations.
 */
const I18N_CARD = {
  en: { 
    title: "Household Tasks", unknown: "Unknown", done: "Done!", saved: "Saved", 
    deleted: "Deleted", confirm_delete: "Really delete this task?", today: "Today", 
    in_days: "in {days} days", ago_days: "{days} days ago", points: "pts.", 
    no_desc: "No description", who_did_it: "Who did it?", fair_points: "Adjust the work shares to keep it fair.", distribute_fairly: "Distribute Fairly", assign_all: "Assign",
    cancel: "Cancel", confirm: "Confirm", save: "Save", task: "Task", name_lbl: "Name", 
    desc_lbl: "Description (optional)", desc_placeholder: "Additional info...",
    interval_lbl: "Days (Interval)", points_lbl: "Points (1-10)", icon_lbl: "Icon", 
    assignees_lbl: "Assignees", select_one: "Please select at least one person!", 
    task_type: "Task Type", onetime: "One-time", recurring: "Recurring",
    recreate_task_prompt: "Create '{taskName}' from a template?",
    set_due_today: "Set due date", pause_until: "Pause until", paused: "Paused until {date}", due_date_lbl: "Due Date", area_lbl: "Area", area_placeholder: "e.g. Kitchen",
    override_overdue_lbl: "Task specific overdue", override_overdue_days_placeholder: "Days",
    time_settings: "Time Settings", subtasks: "Subtasks", 
    add_subtask: "Add Subtask", subtask_placeholder: "Subtask title...",
    completed_percent: "{percent}%",
    confirm_task_complete: "All subtasks are done. Do you want to complete the main task now?",
    complete_subtasks: "Complete Subtasks",
    complete_subtasks_desc: "Complete some subtasks now or finish the main task completely.",
    prev: "Previous", next: "Next", page: "Page", 
    search_placeholder: "Search tasks...",
    all_done: "All done", 
    height_lbl: "Height", width_lbl: "Width", title_lbl: "Title",
    items_per_page_lbl: "Items per Page",
    show_search_lbl: "Show Search",
    show_add_lbl: "Show Add Button",
    show_edit_lbl: "Show Edit Button",
    show_delete_lbl: "Show Delete Button",
    sort_by_lbl: "Sort By",
    sort_by_placeholder: "due_date, points, assignee, alphabet",
    sort_order_lbl: "Sort Order",
    sort_order_placeholder: "default, asc, desc",
    filter_by_lbl: "Filter By",
    filter_by_placeholder: "comma separated, e.g. !paused, due",
    search_btn: "Search", add_task_btn: "Add Task", clear_btn: "Clear"
  },
  de: { 
    title: "Haushaltsliste", unknown: "Unbekannt", done: "Aufgabe erledigt!", saved: "Gespeichert", 
    deleted: "Gelöscht", confirm_delete: "Aufgabe wirklich löschen?", today: "Heute", 
    in_days: "in {days} Tage(n)", ago_days: "vor {days} Tage(n)", points: "Pkt.", 
    no_desc: "Keine Beschreibung", who_did_it: "Wer hat's gemacht?", fair_points: "Stelle die Arbeitsanteile ein, damit es fair bleibt.", distribute_fairly: "Gleichmäßig aufteilen", assign_all: "Zuweisen",
    cancel: "Abbrechen", confirm: "Bestätigen", save: "Speichern", task: "Aufgabe", name_lbl: "Name", 
    desc_lbl: "Beschreibung (optional)", desc_placeholder: "Zusätzliche Infos...", 
    interval_lbl: "Tage (Intervall)", points_lbl: "Punkte (1-10)", icon_lbl: "Icon", 
    assignees_lbl: "Bearbeiter", select_one: "Bitte mindestens eine Person auswählen!", 
    task_type: "Aufgabentyp", onetime: "Einmalig", recurring: "Wiederkehrend",
    recreate_task_prompt: "Möchtest du '{taskName}' aus einer Vorlage erstellen?",
    set_due_today: "Fälligkeit setzen", pause_until: "Pausieren bis", paused: "Pausiert bis {date}", due_date_lbl: "Fälligkeit", area_lbl: "Bereich", area_placeholder: "z.B. Küche",
    override_overdue_lbl: "Aufgabenspezifische Überfälligkeit", override_overdue_days_placeholder: "Tage",
    time_settings: "Zeiteinstellungen", subtasks: "Unteraufgaben",
    add_subtask: "Unteraufgabe hinzufügen", subtask_placeholder: "Titel der Unteraufgabe...",
    completed_percent: "{percent}%",
    confirm_task_complete: "Alle Unteraufgaben sind erledigt. Möchtest du die Hauptaufgabe jetzt abschließen?",
    complete_subtasks: "Unteraufgaben abschließen",
    complete_subtasks_desc: "Schließen Sie jetzt einige Unteraufgaben ab oder schließen Sie die Aufgabe komplett ab.",
    prev: "Zurück", next: "Weiter", page: "Seite", 
    search_placeholder: "Aufgaben suchen...",
    all_done: "Alles erledigen", 
    height_lbl: "Höhe", width_lbl: "Breite", title_lbl: "Titel",
    items_per_page_lbl: "Einträge pro Seite",
    show_search_lbl: "Suche anzeigen",
    show_add_lbl: "Hinzufügen-Button anzeigen",
    show_edit_lbl: "Bearbeiten-Button anzeigen",
    show_delete_lbl: "Löschen-Button anzeigen",
    sort_by_lbl: "Sortieren nach",
    sort_by_placeholder: "due_date, points, assignee, alphabet",
    sort_order_lbl: "Sortierreihenfolge",
    sort_order_placeholder: "default, asc, desc",
    filter_by_lbl: "Filtern nach",
    filter_by_placeholder: "Kommagetrennt, z.B. !paused, due",
    search_btn: "Suchen", add_task_btn: "Aufgabe hinzufügen", clear_btn: "Leeren"
  }
};

/**
 * Make this card available in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-card",
  name: "Task Organizer: Task List",
  description: "A custom list card to display and manage household tasks.",
  preview: true,
});

class TaskOrganizerCard extends HTMLElement {
  /**
   * Initializes the TaskOrganizerCard element and its internal state.
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tasks = {}; 
    this.templates = {};
    this.users = {};
    
    // Default colors: Green, Yellow/Orange, Red
    this.settings = { 
        color_done: 'var(--success-color, #4CAF50)', 
        color_due: 'var(--warning-color, #FFC107)', 
        color_overdue: 'var(--error-color, #F44336)', 
        overdue_days: 5 
    };
    
    this._dataLoaded = false; 
    this._skeletonBuilt = false;
    this._unsubEvents = null;
    this.currentPage = 1;
    this._searchTerm = "";
    this._searchVisible = false;
    this._subtasks = [];
    this._currentTaskId = null;
    this._completionSubtasks = [];
    this._distribution = {};
    this.addEventListener('click', (ev) => this._handleCardClick(ev));
  }

  /**
   * Statically translates a key. Helper for getStubConfig.
   * @param {object} hass - The Home Assistant object.
   * @param {string} key - The translation key.
   * @param {object} replace - Object with parameters to replace in string.
   * @returns {string} - The translated text.
   */
  static _localize(hass, key, replace = null) {
    const lang = (hass && hass.language) ? hass.language.substring(0, 2) : 'en';
    const dict = I18N_CARD[lang] || I18N_CARD['en'];
    let text = dict[key] || I18N_CARD['en'][key] || key;
    
    if (replace) { 
      for (const [k, v] of Object.entries(replace)) { 
        text = text.replace(`{${k}}`, v); 
      } 
    }
    return text;
  }

  /**
   * Translates a given key based on the Home Assistant language.
   * * @param {string} key - The translation key.
   * @param {object} replace - Object with parameters to replace in string.
   * @returns {string} - The translated text.
   */
  localize(key, replace = null) {
    return TaskOrganizerCard._localize(this._hass, key, replace);
  }

  static getLayoutOptions() { 
      return { grid_columns: 4, grid_rows: "auto", grid_min_columns: 1, grid_max_columns: 4 }; 
  }

  /**
   * Generate stub configuration for the Card Picker.
   */
  static getStubConfig(hass) { 
      return { 
          type: "custom:task-organizer-card", 
          title: this._localize(hass, 'title'),
          sort_by: "due_date", 
          sort_order: "default", 
          filter_by: "none",
          items_per_page: 10,
          show_delete: true,
          show_edit: true,
          show_search: true,
          show_add: true
      }; 
  }

  /**
   * Normalizes a string for comparison (lowercase and replaces German umlauts).
   * @param {string} str - The string to normalize.
   * @returns {string} - The normalized string.
   */
  _normalize(str) {
    if (str === null || str === undefined) return "";
    return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
  }

  /**
   * Returns the editor element for GUI configuration.
   * @returns {HTMLElement}
   */
  static getConfigElement() {
    return document.createElement("task-organizer-card-editor");
  }

  /**
   * Sets the configuration from Home Assistant.
   * @param {object} config - The card configuration.
   */
  setConfig(config) { 
      if (!config) throw new Error("Invalid configuration");
      this._config = config; 
      this._skeletonBuilt = false; 
      if (this._hass) this._render();
  }

  /**
   * Called when the element is added to the DOM. Starts subscriptions.
   */
  connectedCallback() { 
      if (this._hass && !this._unsubEvents) { 
          this._subscribeToUpdates(); 
      } 
  }

  /**
   * Called when the element is removed from the DOM. Cleans up subscriptions.
   */
  disconnectedCallback() { 
      if (this._unsubEvents) { 
          this._unsubEvents.then(unsub => unsub()); 
          this._unsubEvents = null; 
      } 
  }

  /**
   * Subscribes to backend updates via websockets.
   * @returns {Promise<void>}
   */
  async _subscribeToUpdates() { 
      if (!this._hass) return;
      this._unsubEvents = this._hass.connection.subscribeEvents(
          () => this._fetchData(), 
          "task_organizer_updated"
      ); 
  }

  /**
   * Sets the Home Assistant object and triggers data fetching.
   * @param {object} hass - The Home Assistant object.
   */
  set hass(hass) {
    this._hass = hass;
    if (!hass) return;
    
    if (this.shadowRoot) {
        const iconPicker = this.shadowRoot.getElementById('f-icon-picker');
        if (iconPicker) iconPicker.hass = hass;
        
        const areaPicker = this.shadowRoot.getElementById('f-area');
        if (areaPicker) areaPicker.hass = hass;
    }

    if (!this._dataLoaded) { 
        this._mapUsers(); 
        this._fetchData(); 
        this._dataLoaded = true; 
    }
    if (!this._unsubEvents) { 
        this._subscribeToUpdates(); 
    }
  }

  /**
   * Maps Home Assistant 'person' entities to the local users object.
   */
  _mapUsers() {
    const users = {};
    for (const entityId in this._hass.states) {
      if (entityId.startsWith('person.')) {
        const state = this._hass.states[entityId];
        if (state.attributes.user_id) {
            users[state.attributes.user_id] = state.attributes.friendly_name || entityId;
        }
      }
    }
    this.users = users;
  }

  /**
   * Fetches the current task and settings data from the backend.
   */
  _fetchData() {
    this._hass.callWS({ type: 'task_organizer/get_data' }).then((data) => {
      this.tasks = data.tasks || {};
      this.templates = data.templates || {};
      if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
      }
      this._render();
    });
  }

  /**
   * Central click handler for the card. Dispatches actions based on target ID or class.
   * @param {Event} ev - The click event.
   */
  _handleCardClick(ev) {
    const path = ev.composedPath();
    const target = path.find(el =>
        (el.id && (el.id.startsWith('btn-') || el.id.startsWith('toggle-'))) ||
        (el.classList && (
            el.classList.contains('action-btn') ||
            el.classList.contains('suggestion-item') ||
            el.classList.contains('subtask-check') ||
            el.classList.contains('sub-complete-check') ||
            el.classList.contains('dist-btn')))
    );
    
    if (!target) return;
    
    ev.stopPropagation();
    const taskId = target.dataset?.id;

    if (target.id === 'btn-add-task') this._openModal();
    else if (target.id === 'btn-search-toggle') {
        this._searchVisible = !this._searchVisible;
        if (!this._searchVisible) {
            this._searchTerm = "";
            this.currentPage = 1;
            this._renderTaskList();
        }
        this._updateSearchVisibility();
    } 
    else if (target.id === 'btn-search-clear') {
        this._searchTerm = "";
        this.currentPage = 1;
        const searchField = this.shadowRoot.getElementById('search-field');
        if (searchField) {
            searchField.value = "";
            searchField.focus();
        }
        this._renderTaskList();
    } 
    else if (target.classList?.contains('btn-complete')) this._checkCompleteAction(taskId);
    else if (target.classList?.contains('btn-edit')) this._openModal(taskId);
    else if (target.classList?.contains('btn-delete')) this._deleteTask(taskId);
    else if (target.id === 'btn-modal-cancel') this._closeModal();
    else if (target.id === 'btn-modal-save') this._saveTask();
    else if (target.id === 'btn-choice-cancel') this._closeChoiceModal();
    else if (target.id === 'btn-choice-confirm') this._confirmCompletion();
    else if (target.id === 'btn-submodal-cancel') this._closeSubtaskCompletionModal();
    else if (target.id === 'btn-submodal-save') this._saveSubtaskProgress();
    else if (target.id === 'btn-submodal-all') this._completeEverything();
    else if (target.classList.contains('sub-complete-check')) this._toggleCompletionSubtask(target.dataset.index);
    else if (target.classList?.contains('suggestion-item')) this._applyTemplate(target.dataset.id);
    else if (target.id === 'btn-prev-page') {
        this.currentPage = Math.max(1, this.currentPage - 1);
        this._renderTaskList();
    } 
    else if (target.id === 'btn-next-page') {
        this.currentPage++;
        this._renderTaskList();
    }
    else if (target.id === 'btn-type-recurring') this._updateTaskTypeUI(false);
    else if (target.id === 'btn-type-onetime') this._updateTaskTypeUI(true);
    // Subtask Handlers
    else if (target.classList.contains('dist-btn')) this._handlePresetDistribution(target.dataset.preset, target.dataset.uid);
    else if (target.id === 'toggle-time-settings') this._toggleSection('time-settings-content');
    else if (target.id === 'toggle-subtasks') this._toggleSection('subtasks-content');
    else if (target.id === 'btn-add-subtask') this._addSubtask();
    else if (target.classList.contains('btn-del-subtask')) this._removeSubtask(target.dataset.index);
    else if (target.classList.contains('subtask-check')) this._toggleSubtaskStatus(target.dataset.index);
  }

  /**
   * Toggles the visibility of a UI section.
   * @param {string} id - The ID of the section to toggle.
   */
  _toggleSection(id) {
    const content = this.shadowRoot.getElementById(id);
    if (!content) return;

    const headerId = "toggle-" + id.replace("-content", "");
    const icon = this.shadowRoot.querySelector(`#${headerId} ha-icon`);
    
    // Prüfe den aktuellen Zustand (inline oder via CSS)
    const isHidden = content.style.display === 'none' || getComputedStyle(content).display === 'none';
    
    if (isHidden) {
        content.style.display = 'flex';
        if (icon) icon.setAttribute('icon', 'mdi:chevron-up');
    } else {
        content.style.display = 'none';
        if (icon) icon.setAttribute('icon', 'mdi:chevron-down');
    }
  }

  /**
   * Explicitly sets the visibility state of a UI section.
   * @param {string} id - The ID of the section.
   * @param {boolean} open - Whether the section should be open.
   */
  _setSectionState(id, open) {
    const content = this.shadowRoot.getElementById(id);
    if (!content) return;

    const headerId = "toggle-" + id.replace("-content", "");
    const icon = this.shadowRoot.querySelector(`#${headerId} ha-icon`);
    if (open) {
        content.style.display = 'flex';
        if (icon) icon.setAttribute('icon', 'mdi:chevron-up');
    } else {
        content.style.display = 'none';
        if (icon) icon.setAttribute('icon', 'mdi:chevron-down');
    }
  }

  /**
   * Determines if a task can be completed directly or requires subtask interaction.
   * @param {string} taskId - The unique identifier of the task.
   */
  _checkCompleteAction(taskId) {
    const task = this.tasks[taskId];
    if (!task) return;

    // Wenn Unteraufgaben vorhanden sind, öffne den neuen Teildialog
    if (task.subtasks && task.subtasks.length > 0) {
        this._openSubtaskCompletionModal(taskId);
    } else {
        this._proceedToAssigneeCheck(taskId);
    }
  }

  /**
   * Opens the modal to manage subtask completion before finishing a main task.
   * @param {string} taskId - The unique identifier of the task.
   */
  _openSubtaskCompletionModal(taskId) {
    this._currentTaskId = taskId;
    const task = this.tasks[taskId];
    this._completionSubtasks = JSON.parse(JSON.stringify(task.subtasks));
    
    const modal = this.shadowRoot.getElementById('subtask-completion-modal');
    const titleEl = this.shadowRoot.getElementById('sub-completion-title');
    if (titleEl) {
        titleEl.textContent = `${task.name} - ${this.localize('complete_subtasks')}`;
    }
    
    this._renderSubtaskCompletionList();
    modal.classList.add('open');
  }

  /**
   * Renders the list of subtasks in the completion modal.
   */
  _renderSubtaskCompletionList() {
    const container = this.shadowRoot.getElementById('sub-completion-list');
    if (!container) return;
    container.innerHTML = this._completionSubtasks.map((st, index) => `
        <ha-formfield label="${st.title}">
            <ha-checkbox class="sub-complete-check" data-index="${index}" ${st.done ? 'checked' : ''}></ha-checkbox>
        </ha-formfield>
    `).join('');
  }

  /**
   * Toggles the completion status of a subtask in the local temporary state.
   * @param {number} index - The index of the subtask in the list.
   */
  _toggleCompletionSubtask(index) {
    this._completionSubtasks[index].done = !this._completionSubtasks[index].done;
    this._renderSubtaskCompletionList();
  }

  /**
   * Closes the subtask completion modal.
   */
  _closeSubtaskCompletionModal() {
    this.shadowRoot.getElementById('subtask-completion-modal').classList.remove('open');
    this._currentTaskId = null;
  }

  /**
   * Saves the current subtask progress to the backend.
   * @returns {Promise<void>}
   */
  async _saveSubtaskProgress() {
    const task = this.tasks[this._currentTaskId];
    if (!task) return;

    // Read the current state of checkboxes directly from the DOM before saving
    const checkboxes = this.shadowRoot.querySelectorAll('.sub-complete-check');
    checkboxes.forEach(cb => {
        const index = parseInt(cb.dataset.index);
        if (this._completionSubtasks[index]) {
            this._completionSubtasks[index].done = cb.checked;
        }
    });

    const allDone = this._completionSubtasks.every(st => st.done);
    
    // Send only the subtasks list to the backend to ensure a partial update
    await this._hass.callWS({
        type: 'task_organizer/edit_task',
        task_id: this._currentTaskId,
        subtasks: this._completionSubtasks
    });

    if (allDone) {
        if (confirm(this.localize('confirm_task_complete'))) {
            this._closeSubtaskCompletionModal();
            this._proceedToAssigneeCheck(task.id);
        } else {
            this._closeSubtaskCompletionModal();
            this._fetchData();
        }
    } else {
        this._closeSubtaskCompletionModal();
        this._fetchData();
    }
  }

  /**
   * Marks all subtasks as done and proceeds to the main task completion workflow.
   * @returns {Promise<void>}
   */
  async _completeEverything() {
    const task = this.tasks[this._currentTaskId];
    const updatedSubtasks = this._completionSubtasks.map(st => ({ ...st, done: true }));

    // Erst alle Unteraufgaben auf erledigt setzen
    await this._hass.callWS({
        type: 'task_organizer/edit_task',
        task_id: this._currentTaskId,
        subtasks: updatedSubtasks
    });

    // Dann direkt zum Abschluss-Workflow (ohne weitere Abfrage der Unteraufgaben)
    this._closeSubtaskCompletionModal();
    this._proceedToAssigneeCheck(task.id);
  }

  /**
   * Logic to determine whether to show the assignee selection dialog or complete directly.
   * @param {string} taskId - The unique identifier of the task.
   */
  _proceedToAssigneeCheck(taskId) {
    const task = this.tasks[taskId];
    const currentUserId = this._hass.user?.id;
    let assignees = task.assignees || [];
    if (typeof assignees === 'string') assignees = [assignees];

    // Only skip the dialog if the task is assigned EXCLUSIVELY to the current user
    const isOnlyMe = assignees.length === 1 && assignees[0] === currentUserId;

    if (isOnlyMe) {
      this._completeTask(taskId, [currentUserId], { [currentUserId]: 100 });
    } else {
      this._openChoiceModal(taskId);
    }
  }

  /**
   * Opens the point distribution modal and initializes the state.
   * @param {string} taskId - The unique identifier of the task.
   */
  _openChoiceModal(taskId) {
    this._currentTaskId = taskId;
    const task = this.tasks[taskId];
    const currentUserId = this._hass.user?.id;
    
    // Calculate relevant users: assignees + current user
    const taskAssignees = Array.isArray(task.assignees) ? task.assignees : [];
    this._activeUids = Object.keys(this.users).filter(uid => 
        taskAssignees.length === 0 || taskAssignees.includes(uid) || uid === currentUserId
    );

    // Initial distribution: current user 100%, others 0%
    this._distribution = {}; // Reset distribution
    this._activeUids.forEach(uid => { this._distribution[uid] = (uid === currentUserId) ? 100 : 0; });

    this._renderChoiceModalContent();
    this.shadowRoot.getElementById('choice-modal').classList.add('open');
  }

  /**
   * Renders the point distribution UI inside the choice modal.
   */
  _renderChoiceModalContent() {
    const container = this.shadowRoot.getElementById('choice-assignees');
    if (!container) return;

    const uids = this._activeUids || [];
    const task = this.tasks[this._currentTaskId];
    let html = '';
    const pointStepPct = (0.5 / (task.complexity || 5)) * 100;

    // Render spider chart container only for 3+ users
    if (uids.length > 2) {
        html += `<div id="spider-container" style="display:flex; justify-content:center; margin-bottom: 0px;"></div>`;
    }

    // Distribute Fairly Button (Right-aligned closer to the diagram)
    html += `
        <div style="display:flex; justify-content:flex-end; margin-top: -10px; margin-bottom: 8px;">
            <ha-button appearance="plain" variant="brand" class="dist-btn" data-preset="equal" style="--mdc-typography-button-font-size: 10px; height: 26px;">${this.localize('distribute_fairly')}</ha-button>
        </div>`;

    // User distribution list
    html += `<div id="dist-list" style="display:flex; flex-direction:column; gap:12px;">`;
    uids.forEach(uid => {
        const pct = (this._distribution[uid] || 0).toFixed(1); // Keep one decimal for display
        const pts = ((pct / 100) * (task.complexity || 0)).toFixed(1); // Calculate points based on percentage
        html += `
            <div class="dist-row" style="display:flex; align-items:flex-start; gap:12px; padding: 8px 0; border-bottom: 1px solid var(--divider-color);">
                <div style="display:flex; flex-direction:column; flex:1; min-width:0;">
                    <span style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.users[uid]}</span>
                    <span class="dist-pct-pts" style="font-size: 11px; color: var(--secondary-text-color);">${pts} ${this.localize('points')}</span>
                </div>
                <input type="range" class="user-dist-slider" data-uid="${uid}" min="0" max="100" step="${pointStepPct}" value="${pct}" style="flex:1.5; height:8px; cursor:pointer; margin-top: 6px;">
                <ha-button appearance="plain" variant="brand" class="dist-btn" data-preset="100" data-uid="${uid}" style="--mdc-typography-button-font-size: 9px; height: 22px; min-width: 90px; margin-top: -5px;">${this.localize('assign_all')}</ha-button>
            </div>
        `;
    });
    html += `</div>`;

    container.innerHTML = html;

    // Only initialize the spider chart if more than 2 users are involved
    if (uids.length > 2) {
        this._renderSpiderChart();
    }
    // Attach input listeners for individual user sliders
    this.shadowRoot.querySelectorAll('.user-dist-slider').forEach(slider => {
        slider.addEventListener('input', (e) => this._handleUserSliderChange(e.target.dataset.uid, parseFloat(e.target.value)));
    });
  }

  /**
   * Renders a spider chart for 3+ users.
   */
  _renderSpiderChart() {
    const container = this.shadowRoot.getElementById('spider-container');
    if (!container) return;
    
    const uids = this._activeUids || [];
    const n = uids.length;
    if (n < 3) return;

    const svgWidth = 200;
    const svgHeight = 200;
    const cx = svgWidth / 2, cy = svgHeight / 2;
    const r = 80; 

    const angleOffset = -Math.PI / 2;
    const vertices = uids.map((_, i) => ({
        x: cx + r * Math.cos(2 * Math.PI * i / n + angleOffset),
        y: cy + r * Math.sin(2 * Math.PI * i / n + angleOffset)
    }));

    // Current position of the handle based on current distribution
    let hx = cx, hy = cy;
    const currentUserId = this._hass.user?.id;
    if (this._distribution[currentUserId] === 100) {
        const idx = uids.indexOf(currentUserId);
        hx = vertices[idx].x; hy = vertices[idx].y;
    }

    const polyPath = vertices.map(v => `${v.x},${v.y}`).join(' ');

    container.innerHTML = ` 
        <svg width="${svgWidth}" height="${svgHeight}" style="overflow:visible; cursor:crosshair;" id="spider-svg">
            <polygon points="${polyPath}" fill="var(--secondary-background-color)" stroke="var(--divider-color)" stroke-width="1" />
            ${vertices.map((v, i) => {
                const anchor = "middle";
                const dx = 0;
                const dy = v.y < cy ? -10 : 20;
                const name = this.users[uids[i]].split(' ')[0];

                return `
                    <line x1="${cx}" y1="${cy}" x2="${v.x}" y2="${v.y}" stroke="var(--divider-color)" stroke-dasharray="2" />
                    <text x="${v.x}" y="${v.y}" dx="${dx}" dy="${dy}" text-anchor="${anchor}" font-size="10" fill="var(--primary-text-color)">${name}</text>
                    <circle cx="${v.x}" cy="${v.y}" r="3" fill="var(--divider-color)" />
                `;
            }).join('')}
            <circle id="spider-handle" cx="${hx}" cy="${hy}" r="8" fill="var(--primary-color)" stroke="white" stroke-width="2" style="cursor:grab; shadow: 0 2px 4px rgba(0,0,0,0.3);" />
        </svg>
    `;

    const svg = this.shadowRoot.getElementById('spider-svg');
    const handle = this.shadowRoot.getElementById('spider-handle');

    // Ensure svg and handle exist before attaching listeners
    if (!svg || !handle) return;

    const update = (e) => {
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        handle.setAttribute('cx', x);
        handle.setAttribute('cy', y);

        let totalWeight = 0;
        const rawWeights = {};
        uids.forEach((uid, i) => {
            const d = Math.sqrt((x - vertices[i].x)**2 + (y - vertices[i].y)**2);
            rawWeights[uid] = Math.pow(Math.max(0, (2 * r) - d), 3);
            totalWeight += rawWeights[uid];
        });

        uids.forEach(uid => {
            this._distribution[uid] = (rawWeights[uid] / totalWeight) * 100;
        });

        this._normalizeDistribution();
        this._updateDistributionUI();
    };

    const onMove = (e) => { if (e.buttons > 0 || e.type === 'touchmove') update(e); };
    svg.addEventListener('mousedown', update);
    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('touchstart', update);
    svg.addEventListener('touchmove', onMove);
  }

  /**
   * Normalizes the current distribution to ensure the sum of points equals task complexity
   * and points are rounded to 0.5 steps. This prevents values from exceeding 100%.
   * @param {string|null} excludeUid - Optional UID to exclude from drift correction (keeps current slider stable).
   */
  _normalizeDistribution(excludeUid = null) {
    const uids = this._activeUids || [];
    const task = this.tasks[this._currentTaskId];
    const totalComplexity = task.complexity || 5;

    let currentPointSum = 0;
    const ptsMap = {};

    // 1. Initial rounding to 0.5 points
    uids.forEach(uid => {
        let pts = (this._distribution[uid] / 100) * totalComplexity;
        pts = Math.round(pts * 2) / 2;
        ptsMap[uid] = pts;
        currentPointSum += pts;
    });

    // 2. Correct sum if rounding caused drift (diff is always a multiple of 0.5)
    let diff = totalComplexity - currentPointSum;
    if (diff !== 0) {
        // Filter uids to avoid adjusting the one currently being moved by the user
        const eligibleUids = uids.filter(uid => uid !== excludeUid);
        const targetUids = eligibleUids.length > 0 ? eligibleUids : uids;
        
        // Adjust the user with the highest share (among eligible) to absorb the error
        const adjustUid = targetUids.sort((a, b) => ptsMap[b] - ptsMap[a])[0];
        ptsMap[adjustUid] = Math.max(0, ptsMap[adjustUid] + diff);
    }

    // 3. Update distribution percentages based on corrected points
    uids.forEach(uid => {
        this._distribution[uid] = (ptsMap[uid] / totalComplexity) * 100;
    });
  }

  /**
   * Updates only the labels in the distribution list for performance.
   */
  _updateDistributionUI() {
    const uids = this._activeUids || [];
    const task = this.tasks[this._currentTaskId];
    const listItems = this.shadowRoot.querySelectorAll('.dist-row');
    uids.forEach((uid, i) => {
        const pts = ((this._distribution[uid] / 100) * task.complexity).toFixed(1);
        const pct = this._distribution[uid].toFixed(1);
        
        const pctPtsSpan = listItems[i].querySelector('.dist-pct-pts');
        if (pctPtsSpan) pctPtsSpan.textContent = `${pts} ${this.localize('points')}`;

        const slider = listItems[i].querySelector('.user-dist-slider');
        if (slider) {
            slider.value = parseFloat(pct);
        }
    });
  }

  /**
   * Confirms the task completion for the selected users.
   */
  _confirmCompletion() {
    const selected = (this._activeUids || []).filter(uid => this._distribution[uid] > 0);
    if (selected.length === 0) { 
        alert(this.localize('select_one')); 
        return; 
    }

    // Round distribution values for the backend
    const roundedDist = {};
    const task = this.tasks[this._currentTaskId];
    (this._activeUids || []).forEach(uid => {
        if (this._distribution[uid] > 0) roundedDist[uid] = this._distribution[uid];
    });
    
    this._completeTask(this._currentTaskId, selected, roundedDist);
    this._closeChoiceModal();
  }

  /**
   * Handles preset distribution buttons (100% for one user, or equal distribution).
   * @param {string} preset - '100' or 'equal'.
   * @param {string} [targetUid] - The user ID for '100%' preset.
   */
  _handlePresetDistribution(preset, targetUid = null) {
    const uids = this._activeUids || [];
    if (preset === 'equal') {
        const share = 100 / uids.length;
        uids.forEach(uid => this._distribution[uid] = share);
    } else if (preset === '100' && targetUid) {
        uids.forEach(uid => this._distribution[uid] = (uid === targetUid) ? 100 : 0);
    }
  this._normalizeDistribution();
    this._updateDistributionUI();
    this._updateSpiderHandlePosition(); // Update spider handle after preset
  }

  /**
   * Handles changes from individual user sliders.
   * @param {string} changedUid - The user ID whose slider was moved.
   * @param {number} newValue - The new percentage value for that user.
   */
  _handleUserSliderChange(changedUid, newValue) {
    const uids = this._activeUids || [];
    const oldPct = this._distribution[changedUid];
    const newPct = newValue;
    const deltaPct = newPct - oldPct;

    this._distribution[changedUid] = newPct;

    // Redistribute delta among other users
    const otherUids = uids.filter(uid => uid !== changedUid);
    const totalOthersPct = otherUids.reduce((sum, uid) => sum + this._distribution[uid], 0);

    if (totalOthersPct > 0) {
        otherUids.forEach(uid => {
            const proportion = this._distribution[uid] / totalOthersPct;
            this._distribution[uid] = Math.max(0, this._distribution[uid] - (deltaPct * proportion));
        });
    } else if (otherUids.length > 0) { // If others are all 0, distribute delta evenly
        const share = Math.abs(deltaPct) / otherUids.length;
        otherUids.forEach(uid => {
            this._distribution[uid] = Math.max(0, this._distribution[uid] + (deltaPct < 0 ? share : -share));
        });
    }

    this._normalizeDistribution(changedUid); // Lock the slider the user is touching
    this._updateDistributionUI();
    this._updateSpiderHandlePosition(); // Update spider handle after slider change
  }

  /**
   * Closes the assignee choice modal.
   */
  _closeChoiceModal() { 
      this.shadowRoot.getElementById('choice-modal').classList.remove('open'); 
  }

  /**
   * Calls the backend service to complete a task.
   * @param {string} taskId - The task ID.
   * @param {string[]} completedBy - Array of user IDs who completed the task.
   */
  // Sends task completion data to the backend via WebSocket.
  /**
   * Sends task completion data to the backend via WebSocket.
   * @param {string} taskId - The ID of the task to complete.
   * @param {string[]} completedBy - List of user IDs who completed the task.
   * @param {object|null} pointsDistribution - Mapping of user ID to point values.
   */
  _completeTask(taskId, completedBy, pointsDistribution = null) { 
    const payload = { 
      type: 'task_organizer/complete_task', 
      task_id: taskId, 
      completed_by: completedBy 
    };
    if (pointsDistribution) { 
      payload.points_distribution = pointsDistribution; 
    }
    this._hass.callWS(payload)
      .catch(err => {
        console.error("TaskOrganizer: Fehler beim Abschließen der Aufgabe", err);
        this._showToast("Fehler: " + (err.message || "Unbekannter Fehler beim Abschließen"));
      });
  }

  /**
   * Updates the position of the spider chart handle based on the current distribution.
   * This is called after preset buttons or individual sliders are used.
   */
  _updateSpiderHandlePosition() {
    const uids = this._activeUids || [];
    const n = uids.length;
    if (n < 3) return;

    const svg = this.shadowRoot.getElementById('spider-svg');
    const handle = this.shadowRoot.getElementById('spider-handle');
    if (!svg || !handle) return;

    const svgWidth = 200;
    const svgHeight = 200;
    const cx = svgWidth / 2, cy = svgHeight / 2;
    const r = 80; 

    const angleOffset = -Math.PI / 2;
    const vertices = uids.map((_, i) => ({
        x: cx + r * Math.cos(2 * Math.PI * i / n + angleOffset),
        y: cy + r * Math.sin(2 * Math.PI * i / n + angleOffset)
    }));

    let weightedX = 0;
    let weightedY = 0;
    let totalWeight = 0;

    uids.forEach((uid, i) => {
        const weight = this._distribution[uid] / 100; // Use current percentage as weight
        weightedX += vertices[i].x * weight;
        weightedY += vertices[i].y * weight;
        totalWeight += weight;
    });

    let finalCx = weightedX / totalWeight;
    let finalCy = weightedY / totalWeight;

    handle.setAttribute('cx', finalCx);
    handle.setAttribute('cy', finalCy);
  }

  /**
   * Displays a toast notification in the Home Assistant UI.
   * @param {string} message - The message to display.
   */
  _showToast(message) {
    const event = new CustomEvent("hass-notification", { 
        detail: { message: message, duration: 3000 }, 
        bubbles: true, 
        composed: true 
    });
    this.dispatchEvent(event);
    
    const root = document.querySelector("home-assistant");
    if (root) { 
        root.dispatchEvent(new CustomEvent("hass-notification", { 
            detail: { message: message, duration: 3000 } 
        })); 
    }
  }

  /**
   * Deletes a task after user confirmation.
   * @param {string} taskId - The ID of the task to delete.
   */
  _deleteTask(taskId) { 
      if (confirm(this.localize('confirm_delete'))) { 
          this._hass.callWS({ type: 'task_organizer/delete_task', task_id: taskId }).then(() => { 
              this._showToast(this.localize('deleted')); 
              this._fetchData(); 
          }); 
      } 
  }

  /**
   * Opens the modal to add or edit a task.
   * @param {string|null} taskId - The ID of the task to edit, or null for a new task.
   */
  _openModal(taskId = null) {
    console.log("Opening modal for task:", taskId);
    this._editingTaskId = taskId;
    const modal = this.shadowRoot.getElementById('task-modal');
    this._subtasks = [];
    
    if (taskId && this.tasks[taskId]) {
        const t = this.tasks[taskId];
        if (this.shadowRoot.getElementById('f-name')) this.shadowRoot.getElementById('f-name').value = t.name;
        if (this.shadowRoot.getElementById('f-description')) this.shadowRoot.getElementById('f-description').value = t.description || "";
        if (this.shadowRoot.getElementById('f-area')) this.shadowRoot.getElementById('f-area').value = t.area || "";
        if (this.shadowRoot.getElementById('f-interval')) {
            this.shadowRoot.getElementById('f-interval').value = (t.interval !== undefined) ? t.interval : 7;
        }
        if (this.shadowRoot.getElementById('f-complexity')) this.shadowRoot.getElementById('f-complexity').value = t.complexity;
        this._subtasks = t.subtasks ? [...t.subtasks] : [];
        this._currentIcon = t.icon || "mdi:broom";
        
        this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => {
            cb.checked = t.assignees && t.assignees.includes(cb.value);
        });
        
        const isOnetime = t.interval === 0;
        this._updateTaskTypeUI(isOnetime);
        this.shadowRoot.getElementById('template-suggestions').style.display = 'none';
        
        const now = new Date();
        now.setHours(0, 0, 0, 0); 

        if (t.paused_until && new Date(t.paused_until) >= now) {
            this.shadowRoot.getElementById('f-pause-cb').checked = true;
            this.shadowRoot.getElementById('f-pause-date').value = t.paused_until;
            this.shadowRoot.getElementById('f-pause-date').disabled = false;
        } else {
            this.shadowRoot.getElementById('f-pause-cb').checked = false;
            this.shadowRoot.getElementById('f-pause-date').value = "";
            this.shadowRoot.getElementById('f-pause-date').disabled = true;
        }
    } else {
        this.shadowRoot.getElementById('f-name').value = ""; 
        this.shadowRoot.getElementById('f-description').value = "";
        this.shadowRoot.getElementById('f-area').value = "";
        this.shadowRoot.getElementById('f-interval').value = 7;
        this.shadowRoot.getElementById('f-complexity').value = 5; 
        this._currentIcon = "mdi:broom";
        this._subtasks = [];
        
        this._updateTaskTypeUI(false); // Default to recurring
        this.shadowRoot.getElementById('template-suggestions').style.display = 'block';
        this.shadowRoot.getElementById('template-suggestions').innerHTML = '';
        this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => cb.checked = false);        

        this.shadowRoot.getElementById('f-pause-cb').checked = false;
        this.shadowRoot.getElementById('f-pause-date').value = "";
        this.shadowRoot.getElementById('f-pause-date').disabled = true;

        this.shadowRoot.getElementById('f-override-overdue-cb').checked = false;
        this.shadowRoot.getElementById('f-override-overdue-days').value = "";
        this.shadowRoot.getElementById('f-override-overdue-days').disabled = true;

    }
    
    const setDueDateCb = this.shadowRoot.getElementById('f-set-due-date-cb');
    const customDueDateInput = this.shadowRoot.getElementById('f-custom-due-date');
    if (setDueDateCb && customDueDateInput) {
        setDueDateCb.checked = false;
        customDueDateInput.value = "";
        customDueDateInput.disabled = true;
    }

    const overrideOverdueCb = this.shadowRoot.getElementById('f-override-overdue-cb');
    const overrideOverdueDays = this.shadowRoot.getElementById('f-override-overdue-days');
    if (taskId && this.tasks[taskId]) {
        const t = this.tasks[taskId];
        if (t.override_overdue_days !== null && t.override_overdue_days !== undefined) {
            overrideOverdueCb.checked = true;
            overrideOverdueDays.value = t.override_overdue_days;
            overrideOverdueDays.disabled = false;
        } else {
            overrideOverdueCb.checked = false;
            overrideOverdueDays.disabled = true;
        }
    }

    // Manage Section Visibility
    let timeSettingsOpen = false;
    if (taskId && this.tasks[taskId]) {
        const t = this.tasks[taskId];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const isPaused = t.paused_until && new Date(t.paused_until) >= now;
        const hasOverride = t.override_overdue_days !== null && t.override_overdue_days !== undefined;
        
        if (isPaused || hasOverride) timeSettingsOpen = true;
    }
    this._setSectionState('time-settings-content', timeSettingsOpen);
    this._setSectionState('subtasks-content', this._subtasks.length > 0);
    this._renderModalSubtasks();

    const picker = this.shadowRoot.getElementById('f-icon-picker');
    if (picker) picker.value = this._currentIcon; 
    
    modal.classList.add('open');
  }

  /**
   * Adds a new subtask to the local temporary state of the task editor.
   */
  _addSubtask() {
    const input = this.shadowRoot.getElementById('new-subtask-title');
    const title = input.value.trim();
    if (!title) return;
    
    this._subtasks.push({ title: title, done: false });
    input.value = '';
    this._renderModalSubtasks();
  }

  /**
   * Removes a subtask from the local temporary state.
   * @param {number} index - The index of the subtask to remove.
   */
  _removeSubtask(index) {
    this._subtasks.splice(index, 1);
    this._renderModalSubtasks();
  }

  /**
   * Toggles the 'done' status of a subtask in the editor.
   * @param {number} index - The index of the subtask.
   */
  _toggleSubtaskStatus(index) {
    this._subtasks[index].done = !this._subtasks[index].done;
    this._renderModalSubtasks();
  }

  /**
   * Renders the list of subtasks in the task editor modal.
   */
  _renderModalSubtasks() {
    const container = this.shadowRoot.getElementById('subtask-list');
    if (!container) return;
    
    if (this._subtasks.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = this._subtasks.map((st, index) => `
        <div style="display: flex; align-items: center; gap: 8px; background: var(--secondary-background-color); padding: 4px 8px; border-radius: 4px;">
            <ha-checkbox class="subtask-check" data-index="${index}" ${st.done ? 'checked' : ''}></ha-checkbox>
            <span style="flex: 1; font-size: 14px; ${st.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${st.title}</span>
            <button class="action-btn btn-del-subtask" data-index="${index}" style="width: 30px; height: 30px;">
                <ha-icon icon="mdi:close" style="--mdc-icon-size: 18px;"></ha-icon>
            </button>
        </div>
    `).join('');
  }

  /**
   * Closes the task editor modal.
   */
  _closeModal() { 
      this.shadowRoot.getElementById('task-modal').classList.remove('open'); 
  }

  /**
   * Gathers data from the modal and saves the task to the backend.
   * @param {boolean} completeAfterSave - Whether to trigger the completion workflow immediately after saving.
   */
  _saveTask(completeAfterSave = false) {
    console.log("Saving task...");
    const name = this.shadowRoot.getElementById('f-name')?.value?.trim();
    if (!name) {
        this._showToast("Name ist erforderlich!");
        return;
    }

    let shouldComplete = completeAfterSave;
    if (!shouldComplete && this._subtasks.length > 0 && this._subtasks.every(st => st.done)) {
        if (confirm(this.localize('confirm_task_complete'))) {
            shouldComplete = true;
        }
    }

    const assignees = [];
    const isOnetime = this.shadowRoot.getElementById('btn-type-onetime')?.classList.contains('active') || false;
    this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => {
        if (cb.checked) assignees.push(cb.value);
    });
    
    const setCustomDueDateCb = this.shadowRoot.getElementById('f-set-due-date-cb')?.checked || false;
    const customDueDateVal = this.shadowRoot.getElementById('f-custom-due-date')?.value;
    let customDueDate = null;
    if (setCustomDueDateCb) {
        if (customDueDateVal) customDueDate = customDueDateVal;
        else customDueDate = new Date().toISOString().split('T')[0];
    }

    const isPausedCb = this.shadowRoot.getElementById('f-pause-cb')?.checked || false;
    const pauseDateVal = this.shadowRoot.getElementById('f-pause-date')?.value;
    const pausedUntil = (isPausedCb && pauseDateVal) ? pauseDateVal : null;

    const isOverrideOverdueCb = this.shadowRoot.getElementById('f-override-overdue-cb')?.checked || false;
    const overrideOverdueDaysVal = this.shadowRoot.getElementById('f-override-overdue-days')?.value;
    const overrideOverdueDays = (isOverrideOverdueCb && overrideOverdueDaysVal) ? (parseInt(overrideOverdueDaysVal) || null) : null;

    const payload = {
      name: name, 
      description: this.shadowRoot.getElementById('f-description')?.value || "",
      area: this.shadowRoot.getElementById('f-area')?.value || "",
      interval: isOnetime ? 0 : parseInt(this.shadowRoot.getElementById('f-interval')?.value) || 7,
      complexity: parseInt(this.shadowRoot.getElementById('f-complexity')?.value) || 5, 
      icon: this.shadowRoot.getElementById('f-icon-picker')?.value || "mdi:broom",
      category: "Allgemein", 
      assignees: assignees,
      custom_due_date: customDueDate,
      paused_until: pausedUntil,
      override_overdue_days: overrideOverdueDays,
      subtasks: this._subtasks
    };
    
    const type = this._editingTaskId ? 'task_organizer/edit_task' : 'task_organizer/add_task';
    if (this._editingTaskId) payload.task_id = this._editingTaskId;
    
    this._hass.callWS({ type, ...payload })
      .then(() => { 
        this._showToast(this.localize('saved')); 
        this._closeModal(); 
        this._fetchData(); 
        if (shouldComplete) {
            const finalTaskId = this._editingTaskId || 
                               Object.values(this.tasks).find(t => t.name === payload.name)?.id;
            
            if (finalTaskId) {
                this._checkCompleteAction(finalTaskId);
            }
        }
      })
      .catch(err => {
        console.error("TaskOrganizer: Fehler beim Speichern", err);
        this._showToast("Fehler: " + (err.message || "Unbekannter Fehler"));
      });
  }

  /**
   * Returns the CSS styles for the card.
   * @returns {string} - The CSS style string.
   */
  _getStyles() {
      const height = this._config.card_height || '100%';
      const width = this._config.card_width || '100%';

      return `
        <style>
          :host { display: block; width: ${width}; margin: 0 auto; } 
          ha-card { width: 100%; height: ${height}; padding: 16px; display: flex; flex-direction: column; overflow-x: hidden; overflow-y: auto; position: relative; min-height: 100px; } 
          
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; } 
          .header span { font-size: 20px; font-weight: bold; color: var(--primary-text-color); } 
          .header-actions { display: flex; gap: 8px; align-items: center; }
          
          .icon-button { background: transparent; border: none; cursor: pointer; color: var(--primary-text-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transition: background-color 0.2s, transform 0.1s; }
          .icon-button:hover { background-color: var(--secondary-background-color); }
          
          .add-button { background: var(--primary-color, #2196F3) !important; color: white !important; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
          .add-button:hover { background: var(--dark-primary-color, #1976D2) !important; transform: scale(1.05); }
          
          .search-container { display: none; margin-bottom: 15px; position: relative; }
          .search-container.visible { display: flex; align-items: center; gap: 8px; }
          .clear-search { position: absolute; right: 10px; cursor: pointer; color: var(--secondary-text-color); transition: color 0.2s; }
          .clear-search:hover { color: var(--primary-text-color); }
          
          #task-list-wrapper { display: flex; flex-direction: column; flex-grow: 1; width: 100%; }
          .task-list { display: flex; flex-direction: column; gap: 10px; width: 100%; } 
          
          .task-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; border-left: 6px solid var(--status-color); border: 1px solid var(--divider-color); background-color: color-mix(in srgb, var(--status-color), transparent 92%); transition: transform 0.2s; min-height: 75px; box-sizing: border-box; } 
          .task-item:hover { background-color: color-mix(in srgb, var(--status-color), transparent 85%); transform: translateX(2px); box-shadow: -2px 4px 8px rgba(0,0,0,0.1); } 
          .task-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; color: var(--primary-text-color); } 
          .task-text { flex: 1; min-width: 0; word-break: break-word; text-align: left; } 
          .task-title { font-weight: bold; margin: 0; font-size: 15px; display: flex; align-items: center; gap: 4px; cursor: help; overflow: hidden; } 
          .task-title span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .task-meta { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; } 
          
          .assignees-icons { display: flex; margin-top: 6px; gap: 4px; } 
          .mini-avatar { width: 22px; height: 22px; border-radius: 50%; background: var(--secondary-text-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; text-transform: uppercase; box-shadow: 0 1px 3px rgba(0,0,0,0.2); cursor: help; } 
          
          .actions { display: flex; gap: 4px; flex-shrink: 0; } 
          .action-btn { background: transparent; border: none; padding: 8px; border-radius: 50%; cursor: pointer; color: var(--secondary-text-color); transition: background-color 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; }
          .action-btn:hover { background-color: var(--secondary-background-color); color: var(--primary-text-color); }
          .btn-complete { color: var(--success-color, #4CAF50); } 
          .btn-edit { color: var(--info-color, #2196F3); } 
          .btn-delete { color: var(--error-color, #F44336); } 
          
          .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
          
          .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; } 
          .modal.open { display: flex; } 
          .modal-content { background: var(--card-background-color); color: var(--primary-text-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 450px; max-height: 90vh; overflow-y: auto; box-shadow: 0px 4px 16px rgba(0,0,0,0.5); } 
          
          .form-label { font-size: 14px; font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; display: block; } 
          .task-type-selector { display: flex; border: 1px solid var(--divider-color); border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
          .type-btn { flex: 1; padding: 12px; background: transparent; border: none; cursor: pointer; color: var(--secondary-text-color); font-size: 14px; font-weight: 500; transition: background-color 0.2s, color 0.2s; }
          .type-btn.active { background: var(--primary-color); color: var(--text-primary-color, white); }
          .form-row { display: flex; gap: 16px; }
          .form-col { flex: 1; }
          .template-suggestions { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
          .suggestion-item { background: transparent; border: none; color: var(--primary-color); cursor: pointer; text-align: left; padding: 4px 0; font-size: 14px; }
          .suggestion-item:hover { text-decoration: underline; }

          .collapsible-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; cursor: pointer; border-top: 1px solid var(--divider-color); margin-top: 8px; color: var(--primary-text-color); font-weight: 500; }
          .collapsible-content { display: none; flex-direction: column; gap: 16px; padding: 8px 0 16px 0; }
          .subtask-input-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
          .subtask-list { display: flex; flex-direction: column; gap: 6px; }
        </style>
      `;
  }

  /**
   * Builds the basic HTML skeleton of the card.
   */
  _buildSkeleton() {
    const displayTitle = this._config.title || this.localize('title');
    const showSearch = this._config.show_search !== false; 
    const showAdd = this._config.show_add !== false; 
    const showEdit = this._config.show_edit !== false; 

    let html = this._getStyles();
    html += `
      <ha-card>
        <div class="header">
            <span>${displayTitle}</span>
            <div class="header-actions">
                ${showSearch ? `<button class="icon-button" id="btn-search-toggle" title="${this.localize('search_btn')}"><ha-icon icon="mdi:magnify"></ha-icon></button>` : ''}
                ${showAdd ? `<button class="icon-button add-button" id="btn-add-task" title="${this.localize('add_task_btn')}"><ha-icon icon="mdi:plus"></ha-icon></button>` : ''}
            </div>
        </div>
        
        <div class="search-container" id="search-container">
            <ha-textfield class="search-input" id="search-field" placeholder="${this.localize('search_placeholder')}" icon="mdi:magnify" style="width: 100%;"></ha-textfield>
            <ha-icon icon="mdi:close" class="clear-search" id="btn-search-clear" title="${this.localize('clear_btn')}"></ha-icon>
        </div>

        <div id="task-list-wrapper"></div>

        <div id="choice-modal" class="modal">
            <div class="modal-content">
                <h2 style="margin: 0 0 8px 0;">${this.localize('who_did_it')}</h2>
                <p style="font-size: 14px; color: var(--secondary-text-color); margin-bottom: 16px;">${this.localize('fair_points')}</p>
                <div id="choice-assignees" style="display:flex; flex-direction:column; gap:4px;"></div>
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:24px;">
                    <ha-button appearance="plain" variant="brand" id="btn-choice-cancel">${this.localize('cancel')}</ha-button>
                    <ha-button raised id="btn-choice-confirm">${this.localize('confirm')}</ha-button>
                </div>
            </div>
        </div>
        
        <div id="subtask-completion-modal" class="modal">
            <div class="modal-content">
                <h2 id="sub-completion-title" style="margin: 0 0 8px 0;">${this.localize('complete_subtasks')}</h2>
                <p style="font-size: 14px; color: var(--primary-text-color); margin-bottom: 16px; font-style: italic;">${this.localize('complete_subtasks_desc')}</p>
                <div id="sub-completion-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                <div style="display:flex; justify-content:flex-end; align-items: center; gap:8px; margin-top:24px; flex-wrap: wrap;">
                    <ha-button appearance="plain" variant="brand" id="btn-submodal-cancel">${this.localize('cancel')}</ha-button>
                    <div style="flex: 1;"></div>
                    <ha-button id="btn-submodal-save">${this.localize('save')}</ha-button>
                    <ha-button raised id="btn-submodal-all">${this.localize('all_done')}</ha-button>
                </div>
            </div>
        </div>
        
        <div id="task-modal" class="modal">
            <div class="modal-content">
                <h2 style="margin: 0 0 20px 0;">${this.localize('task')}</h2>
                
                <div class="task-type-selector">
                    <button class="type-btn" id="btn-type-recurring">${this.localize('recurring')}</button>
                    <button class="type-btn" id="btn-type-onetime">${this.localize('onetime')}</button>
                </div>

                <div style="display:flex; flex-direction:column; gap:16px;">
                    <div>
                        <ha-textfield id="f-name" label="${this.localize('name_lbl')}" style="width: 100%;"></ha-textfield>
                        <div id="template-suggestions"></div>
                    </div>
                    <ha-textfield id="f-description" label="${this.localize('desc_lbl')}"></ha-textfield>
                    
                    <div class="form-row">
                        <ha-textfield id="f-interval" type="number" label="${this.localize('interval_lbl')}" class="form-col"></ha-textfield>
                        <ha-textfield id="f-complexity" type="number" label="${this.localize('points_lbl')}" min="1" max="10" class="form-col"></ha-textfield>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <label class="form-label">${this.localize('icon_lbl')}</label>
                            <ha-icon-picker id="f-icon-picker"></ha-icon-picker>
                        </div>
                        <div class="form-col">
                            <label class="form-label">${this.localize('area_lbl')}</label>
                            <ha-area-picker id="f-area"></ha-area-picker>
                        </div>
                    </div>

                    <div>
                        <label class="form-label">${this.localize('assignees_lbl')}</label>
                        <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px;">
                            ${Object.entries(this.users).map(([uid, name]) => `
                                <ha-formfield label="${name}">
                                    <ha-checkbox class="assignee-cb" id="cb-${uid}" value="${uid}"></ha-checkbox>
                                </ha-formfield>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div id="toggle-time-settings" class="collapsible-header">
                        <span>${this.localize('time_settings')}</span>
                        <ha-icon icon="mdi:chevron-down"></ha-icon>
                    </div>
                    <div id="time-settings-content" class="collapsible-content">
                        <div style="display:flex; flex-direction:column; gap:16px;">
                            <div style="display:flex; align-items:center; gap:16px;">
                                <ha-formfield label="${this.localize('set_due_today')}">
                                    <ha-switch id="f-set-due-date-cb"></ha-switch>
                                </ha-formfield>
                                <input type="date" id="f-custom-due-date" style="flex:1; height: 56px; box-sizing: border-box; padding: 0 16px; border: 1px solid var(--divider-color); border-radius: 4px; background: transparent; color: var(--primary-text-color); font-size: 16px; font-family: inherit;" disabled>
                            </div>
                            <div style="display:flex; align-items:center; gap:16px;">
                                <ha-formfield label="${this.localize('override_overdue_lbl')}">
                                    <ha-switch id="f-override-overdue-cb"></ha-switch>
                                </ha-formfield>
                                <ha-textfield id="f-override-overdue-days" type="number" min="0" max="9999" style="flex:1;" placeholder="${this.localize('override_overdue_days_placeholder')}" disabled></ha-textfield>
                            </div>
                            <div style="display:flex; align-items:center; gap:16px;">
                                <ha-formfield label="${this.localize('pause_until')}">
                                    <ha-switch id="f-pause-cb"></ha-switch>
                                </ha-formfield>
                                <input type="date" id="f-pause-date" style="flex:1; height: 56px; box-sizing: border-box; padding: 0 16px; border: 1px solid var(--divider-color); border-radius: 4px; background: transparent; color: var(--primary-text-color); font-size: 16px; font-family: inherit;" disabled>
                            </div>
                        </div>
                    </div>

                    <div id="toggle-subtasks" class="collapsible-header">
                        <span>${this.localize('subtasks')}</span>
                        <ha-icon icon="mdi:chevron-down"></ha-icon>
                    </div>
                    <div id="subtasks-content" class="collapsible-content">
                        <div class="subtask-input-row">
                            <ha-textfield id="new-subtask-title" placeholder="${this.localize('subtask_placeholder')}" style="flex: 1;"></ha-textfield>
                            <ha-button id="btn-add-subtask">${this.localize('confirm')}</ha-button>
                        </div>
                        <div id="subtask-list" class="subtask-list"></div>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:24px;">
                    <ha-button appearance="plain" variant="brand" id="btn-modal-cancel">${this.localize('cancel')}</ha-button>
                    <ha-button raised id="btn-modal-save">${this.localize('save')}</ha-button>
                </div>
            </div>
        </div>
      </ha-card>
    `;
    
    this.shadowRoot.innerHTML = html;

    const searchField = this.shadowRoot.getElementById('search-field');
    if (searchField) {
        searchField.addEventListener('input', (e) => {
            this._searchTerm = e.target.value;
            this.currentPage = 1; 
            this._renderTaskList();
        });
    }

    const nameField = this.shadowRoot.getElementById('f-name');
    if (nameField) {
        nameField.addEventListener('input', (e) => this._handleTemplateSuggestions(e));
    }
    
    const iconPicker = this.shadowRoot.getElementById('f-icon-picker');
    if (iconPicker) iconPicker.hass = this._hass; 
    
    const areaPicker = this.shadowRoot.getElementById('f-area');
    if (areaPicker) areaPicker.hass = this._hass;
    
    const pauseCb = this.shadowRoot.getElementById('f-pause-cb');
    const pauseDate = this.shadowRoot.getElementById('f-pause-date');
    if (pauseCb && pauseDate) {
        pauseCb.addEventListener('change', (e) => {
            pauseDate.disabled = !e.target.checked;
            if (e.target.checked && !pauseDate.value) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                pauseDate.value = tomorrow.toISOString().split('T')[0];
            }
        });
    }

    const setDueDateCb = this.shadowRoot.getElementById('f-set-due-date-cb');
    const customDueDateInput = this.shadowRoot.getElementById('f-custom-due-date');
    if (setDueDateCb && customDueDateInput) {
        setDueDateCb.addEventListener('change', (e) => {
            customDueDateInput.disabled = !e.target.checked;
            if (e.target.checked && !customDueDateInput.value) {
                const today = new Date();
                customDueDateInput.value = today.toISOString().split('T')[0];
            }
        });
    }

    const overrideOverdueCb = this.shadowRoot.getElementById('f-override-overdue-cb');
    const overrideOverdueDays = this.shadowRoot.getElementById('f-override-overdue-days');
    if (overrideOverdueCb && overrideOverdueDays) {
        overrideOverdueCb.addEventListener('change', (e) => {
            overrideOverdueDays.disabled = !e.target.checked;
            if (!e.target.checked) {
                overrideOverdueDays.value = "";
            }
        });
    }
  }

  /**
   * Updates the UI state when switching between recurring and one-time tasks.
   * @param {boolean} isOnetime - Whether the task is one-time.
   */
  _updateTaskTypeUI(isOnetime) {
    const intervalField = this.shadowRoot.getElementById('f-interval');
    const btnOnetime = this.shadowRoot.getElementById('btn-type-onetime');
    const btnRecurring = this.shadowRoot.getElementById('btn-type-recurring');

    if (isOnetime) {
        intervalField.disabled = true;
        intervalField.value = 0;
        btnOnetime.classList.add('active');
        btnRecurring.classList.remove('active');
    } else {
        intervalField.disabled = false;
        if (intervalField.value == 0) intervalField.value = 7;
        btnOnetime.classList.remove('active');
        btnRecurring.classList.add('active');
    }
  }

  /**
   * Searches for templates matching the current input name and displays suggestions.
   * @param {Event} e - The input event.
   */
  _handleTemplateSuggestions(e) {
    const input = e.target.value.toLowerCase();
    const suggestionsContainer = this.shadowRoot.getElementById('template-suggestions');
    suggestionsContainer.innerHTML = '';

    if (this._editingTaskId || input.length < 3) {
        return;
    }

    const matchingTemplates = Object.values(this.templates).filter(t => 
        t.name.toLowerCase().includes(input)
    );

    if (matchingTemplates.length > 0) {
        matchingTemplates.slice(0, 5).forEach(template => {
            const suggestionEl = document.createElement('button');
            suggestionEl.className = 'suggestion-item';
            suggestionEl.dataset.id = template.id;
            suggestionEl.textContent = this.localize('recreate_task_prompt', { taskName: template.name });
            suggestionsContainer.appendChild(suggestionEl);
        });
    }
  }

  /**
   * Populates the task editor with data from a template.
   * @param {string} templateId - The ID of the template to apply.
   */
  _applyTemplate(templateId) {
    if (templateId && this.templates[templateId]) {
        const t = this.templates[templateId];
        this.shadowRoot.getElementById('f-name').value = t.name;
        this.shadowRoot.getElementById('f-description').value = t.description || '';
        this.shadowRoot.getElementById('f-area').value = t.area || '';
        this.shadowRoot.getElementById('f-complexity').value = t.complexity || 5;
        this.shadowRoot.getElementById('f-icon-picker').value = t.icon || 'mdi:broom';
        this.shadowRoot.getElementById('template-suggestions').innerHTML = '';
        
        this._subtasks = t.subtasks ? JSON.parse(JSON.stringify(t.subtasks)) : [];
        this._renderModalSubtasks();
        this._setSectionState('subtasks-content', this._subtasks.length > 0);

        const isOnetimeSelected = this.shadowRoot.getElementById('btn-type-onetime').classList.contains('active');
        if (isOnetimeSelected) {
            this.shadowRoot.getElementById('f-interval').value = 0;
        } else {
            this.shadowRoot.getElementById('f-interval').value = t.interval > 0 ? t.interval : 7;
        }

        this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => {
            cb.checked = t.assignees && t.assignees.includes(cb.value);
        });
    }
  }

  /**
   * Updates the visibility of the search bar based on internal state.
   */
  _updateSearchVisibility() {
      const container = this.shadowRoot.getElementById('search-container');
      const searchField = this.shadowRoot.getElementById('search-field');
      if (!container) return;
      
      if (this._searchVisible) {
          container.classList.add('visible');
          if (searchField) setTimeout(() => searchField.focus(), 50); 
      } else {
          container.classList.remove('visible');
      }
  }

  /**
   * Main render function that ensures the skeleton is built and the list is updated.
   */
  _render() {
    if (!this._config || !this._hass) return;

    if (!this._skeletonBuilt) {
        this._buildSkeleton();
        this._skeletonBuilt = true;
    }

    this._updateSearchVisibility();
    this._renderTaskList();
  }

  /**
   * Filters, sorts, and renders the list of tasks.
   */
  _renderTaskList() {
    const wrapper = this.shadowRoot.getElementById('task-list-wrapper');
    if (!wrapper) return;

    let filters = [];
    if (Array.isArray(this._config.filter_by)) {
        filters = this._config.filter_by;
    } else if (typeof this._config.filter_by === 'string' && this._config.filter_by !== 'none') {
        filters = this._config.filter_by.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    const sortBy = this._config.sort_by || 'due_date';
    const sortOrder = this._config.sort_order || 'default';
    const itemsPerPage = this._config.items_per_page;
    const showDelete = this._config.show_delete !== false;
    const showEdit = this._config.show_edit !== false;

    const nowForSort = new Date(); 
    nowForSort.setHours(0,0,0,0);
    const currentUserId = this._hass.user.id;

    let taskArray = Object.values(this.tasks).filter(task => {
        const d = new Date(task.due_date); 
        d.setHours(0,0,0,0);
        
        const diff = Math.round((d - nowForSort) / (1000 * 60 * 60 * 24));
        const isPaused = task.paused_until && new Date(task.paused_until) > nowForSort;
        const overdueThreshold = (task.override_overdue_days !== null && task.override_overdue_days !== undefined)
            ? task.override_overdue_days : this.settings.overdue_days;
        const overdueDiff = -overdueThreshold;

        const isCurrentUser = task.assignees && task.assignees.includes(currentUserId);
        const isAssigned = task.assignees && task.assignees.length > 0;
        const isDone = !isPaused && diff > 0;
        const isDue = !isPaused && diff <= 0 && diff > overdueDiff;
        const isOverdue = !isPaused && diff <= overdueDiff;
        const isPausedFilter = isPaused;
        const isOnetime = task.interval === 0;

        let keep = true;
        for (const f of filters) {
            let negate = f.startsWith('!');
            let filterName = negate ? f.substring(1) : f;
            let match = false;

            if (filterName === 'current_user') match = isCurrentUser;
            else if (filterName === 'assigned') match = isAssigned;
            else if (filterName === 'done') match = isDone;
            else if (filterName === 'due') match = isDue;
            else if (filterName === 'overdue') match = isOverdue;
            else if (filterName === 'paused') match = isPausedFilter;
            else if (filterName === 'onetime') match = isOnetime;
            else if (filterName.startsWith('room:')) {
                // Normalize both target area from filter and task area for reliable matching
                const targetArea = this._normalize(filterName.substring(5));
                match = (this._normalize(task.area) === targetArea);
            } else match = true; // unknown filter, ignore

            if (negate) match = !match;

            if (!match) {
                keep = false;
                break;
            }
        }
        if (!keep) return false;

        if (this._searchTerm) {
            const term = this._searchTerm.toLowerCase();
            const nameMatch = task.name?.toLowerCase().includes(term);
            const descMatch = task.description?.toLowerCase().includes(term);
            if (!nameMatch && !descMatch) return false;
        }
        
        return true; 
    });
    
    taskArray.sort((a, b) => {
      const aPaused = a.paused_until && new Date(a.paused_until) > nowForSort;
      const bPaused = b.paused_until && new Date(b.paused_until) > nowForSort;

      let cmp = 0;
      if (sortBy === 'points') cmp = a.complexity - b.complexity;
      else if (sortBy === 'assignee') {
          const aName = (a.assignees && a.assignees.length > 0) ? (this.users[a.assignees[0]] || 'z') : 'z';
          const bName = (b.assignees && b.assignees.length > 0) ? (this.users[b.assignees[0]] || 'z') : 'z';
          cmp = aName.localeCompare(bName);
      } 
      else if (sortBy === 'alphabet') cmp = a.name.localeCompare(b.name);
      else { 
          if (aPaused && !bPaused) cmp = 1;
          else if (!aPaused && bPaused) cmp = -1;
          else cmp = new Date(a.due_date) - new Date(b.due_date);
      }

      if (sortOrder === 'desc') return -cmp;
      if (sortOrder === 'asc') return cmp;
      return cmp; 
    });

    let paginatedTasks = taskArray;
    let totalPages = 1;

    if (itemsPerPage && itemsPerPage > 0) {
      totalPages = Math.max(1, Math.ceil(taskArray.length / itemsPerPage));
      if (this.currentPage > totalPages) this.currentPage = Math.max(1, totalPages);
      
      const startIndex = (this.currentPage - 1) * itemsPerPage;
      paginatedTasks = taskArray.slice(startIndex, startIndex + itemsPerPage);
    }

    let html = `<div class="task-list">`;

    paginatedTasks.forEach(task => {
      const d = new Date(task.due_date); 
      d.setHours(0,0,0,0);
      const now = new Date(); 
      now.setHours(0,0,0,0);
      
      const diff = Math.round((d - now) / (1000 * 60 * 60 * 24));
      const isPaused = task.paused_until && new Date(task.paused_until) > nowForSort;
      const overdueThreshold = (task.override_overdue_days !== null && task.override_overdue_days !== undefined)
        ? task.override_overdue_days
        : this.settings.overdue_days;
      
      let borderColor = this.settings.color_done;
      let timeText = this.localize('today');
      
      if (isPaused) {
        borderColor = 'var(--disabled-text-color, #9e9e9e)'; 
        timeText = this.localize('paused', {date: new Date(task.paused_until).toLocaleDateString()});
      } else {
        if (diff <= 0) borderColor = this.settings.color_due;
        if (diff <= -overdueThreshold) borderColor = this.settings.color_overdue;
        
        if (diff > 0) timeText = this.localize('in_days', {days: diff});
        else if (diff < 0) timeText = this.localize('ago_days', {days: Math.abs(diff)});
      }

      let areaName = task.area || "";
      if (task.area && this._hass.areas && this._hass.areas[task.area]) {
          areaName = this._hass.areas[task.area].name;
      }
      
      let assigneesList = Array.isArray(task.assignees) ? task.assignees : (task.assignees ? [task.assignees] : []);
      const assigneeHtml = assigneesList.map(uid => `
          <div class="mini-avatar" title="${this.users[uid] || this.localize('unknown')}">
              ${(this.users[uid] || '?').charAt(0).toUpperCase()}
          </div>
      `).join('');

      // Subtask Progress Logic
      let progressText = "";
      let subtaskTooltip = "";
      if (task.subtasks && task.subtasks.length > 0) {
          const total = task.subtasks.length;
          const completed = task.subtasks.filter(st => st.done).length;
          if (completed > 0) {
              const percent = Math.round((completed / total) * 100);
              progressText = ` • ${this.localize('completed_percent', {percent: percent})}`;
          }
          const subtaskList = task.subtasks.map(st => `${st.done ? '✓' : '○'} ${st.title}`).join('&#10;');
          subtaskTooltip = `${this.localize('subtasks')}:&#10;${subtaskList}`;
      }

      const descTooltip = task.description ? task.description.replace(/"/g, '&quot;') : "";
      let itemStyle = `--status-color: ${borderColor};`;
      if (isPaused) itemStyle += ` opacity: 0.6; filter: grayscale(0.8);`;

      html += `
        <div class="task-item" style="${itemStyle}">
            <div class="task-info">
                <ha-icon icon="${task.icon || 'mdi:broom'}" style="flex-shrink: 0;"></ha-icon>
                <div class="task-text">
                    <div class="task-title">
                        <span ${descTooltip ? `title="${descTooltip}"` : 'style="cursor: default;"'}>${task.name}</span>
                        ${task.subtasks?.length > 0 ? `<ha-icon icon="mdi:book-multiple-outline" style="--mdc-icon-size: 14px; flex-shrink: 0; opacity: 0.7;" title="${subtaskTooltip}"></ha-icon>` : ''}
                        ${task.interval === 0 ? `<ha-icon icon="mdi:numeric-1-circle-outline" style="--mdc-icon-size: 14px; flex-shrink: 0; opacity: 0.7;" title="${this.localize('onetime')}"></ha-icon>` : ''}
                    </div>
                    <div class="task-meta">${areaName ? areaName + ' • ' : ''}${timeText} • ${task.complexity} ${this.localize('points')}${progressText}</div>
                    <div class="assignees-icons">${assigneeHtml}</div>
                </div>
            </div>
            <div class="actions">
                <button class="action-btn btn-complete" data-id="${task.id}"><ha-icon icon="mdi:check"></ha-icon></button>
                ${showEdit ? `<button class="action-btn btn-edit" data-id="${task.id}"><ha-icon icon="mdi:pencil"></ha-icon></button>` : ''}
                ${showDelete ? `<button class="action-btn btn-delete" data-id="${task.id}"><ha-icon icon="mdi:delete"></ha-icon></button>` : ''}
            </div>
        </div>
      `;
    });

    html += `</div>`;

    if (itemsPerPage && itemsPerPage > 0 && taskArray.length > itemsPerPage) {
        html += `
            <div class="pagination">
                <ha-button id="btn-prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>${this.localize('prev')}</ha-button>
                <span style="font-size: 14px; color: var(--secondary-text-color); font-weight: 500;">${this.localize('page')} ${this.currentPage} / ${totalPages}</span>
                <ha-button id="btn-next-page" ${this.currentPage === totalPages ? 'disabled' : ''}>${this.localize('next')}</ha-button>
            </div>
        `;
    }

    wrapper.innerHTML = html;
  }
}

/**
 * Editor for the TaskOrganizerCard.
 */
class TaskOrganizerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  /**
   * Translates a key using the static helper of the card.
   * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  localize(key) {
    return TaskOrganizerCard._localize(this._hass, key);
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (this._rendered) {
        this._updateUI();
        return;
    }
    this.innerHTML = `
      <div class="card-config">
        <ha-textfield label="${this.localize('title_lbl')}" value="${this._config.title || this.localize('title')}" configValue="title"></ha-textfield>
        <div style="display: flex; gap: 8px;">
          <ha-textfield label="${this.localize('height_lbl')}" placeholder="400px" value="${this._config.card_height || ''}" configValue="card_height" style="flex:1"></ha-textfield>
          <ha-textfield label="${this.localize('width_lbl')}" placeholder="100%" value="${this._config.card_width || ''}" configValue="card_width" style="flex:1"></ha-textfield>
        </div>
        <ha-textfield label="${this.localize('items_per_page_lbl')}" type="number" value="${this._config.items_per_page || 10}" configValue="items_per_page"></ha-textfield>
        
        <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 16px;">
          <ha-formfield label="${this.localize('show_search_lbl')}">
            <ha-checkbox ${this._config.show_search !== false ? 'checked' : ''} configValue="show_search"></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="${this.localize('show_add_lbl')}">
            <ha-checkbox ${this._config.show_add !== false ? 'checked' : ''} configValue="show_add"></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="${this.localize('show_edit_lbl')}">
            <ha-checkbox ${this._config.show_edit !== false ? 'checked' : ''} configValue="show_edit"></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="${this.localize('show_delete_lbl')}">
            <ha-checkbox ${this._config.show_delete !== false ? 'checked' : ''} configValue="show_delete"></ha-checkbox>
          </ha-formfield>
        </div>

        <ha-textfield label="${this.localize('sort_by_lbl')}" placeholder="${this.localize('sort_by_placeholder')}" value="${this._config.sort_by || 'due_date'}" configValue="sort_by" style="width: 100%; margin-top: 16px;"></ha-textfield>
        <ha-textfield label="${this.localize('sort_order_lbl')}" placeholder="${this.localize('sort_order_placeholder')}" value="${this._config.sort_order || 'default'}" configValue="sort_order" style="width: 100%; margin-top: 8px;"></ha-textfield>
        <ha-textfield label="${this.localize('filter_by_lbl')}" placeholder="${this.localize('filter_by_placeholder')}" value="${this._config.filter_by || ''}" configValue="filter_by" style="width: 100%; margin-top: 16px;"></ha-textfield>
      </div>
      <style>
        .card-config ha-textfield, .card-config ha-select {
          display: block;
          margin-bottom: 8px;
        }
        ha-formfield {
          display: flex;
          align-items: center;
        }
      </style>
    `;

    this._rendered = true;
    this.querySelectorAll('ha-textfield').forEach(el => el.addEventListener('input', ev => this._valueChanged(ev)));
    this.querySelectorAll('ha-checkbox').forEach(el => el.addEventListener('change', ev => this._valueChanged(ev)));
    this._updateUI();
  }

  /**
   * Updates the UI elements with current config values without re-rendering the whole HTML.
   */
  _updateUI() {
    if (!this._rendered) return;
    this.querySelectorAll('[configValue]').forEach(el => {
        const key = el.getAttribute('configValue');
        const value = this._config[key];
        if (el.tagName === 'HA-CHECKBOX') {
            el.checked = value !== false;
        } else if (value !== undefined) {
            el.value = value;
        }
    });
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    ev.stopPropagation();
    const target = ev.target;
    const configValue = target.configValue || target.getAttribute('configValue');
    let newValue = (target.value !== undefined) ? target.value : target.getAttribute('value');

    if (target.tagName === 'HA-CHECKBOX') {
      newValue = target.checked;
    } else if (target.tagName === 'HA-TEXTFIELD' && (target.type === 'number' || target.getAttribute('type') === 'number' || target.hasAttribute('type') && target.getAttribute('type') === 'number')) {
      newValue = newValue === "" ? undefined : parseInt(newValue);
    }

    if (this._config[configValue] === newValue) return;

    const event = new CustomEvent("config-changed", {
      detail: { config: { ...this._config, [configValue]: newValue } },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define('task-organizer-card-editor', TaskOrganizerCardEditor);
customElements.define('task-organizer-card', TaskOrganizerCard);