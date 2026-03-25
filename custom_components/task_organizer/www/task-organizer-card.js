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
    no_desc: "No description", who_did_it: "Who did it?", fair_points: "Points are shared fairly.", 
    cancel: "Cancel", confirm: "Confirm", save: "Save", task: "Task", name_lbl: "Name", 
    desc_lbl: "Description (optional)", desc_placeholder: "Additional info...", 
    interval_lbl: "Days (Interval)", points_lbl: "Points (1-10)", icon_lbl: "Icon", 
    assignees_lbl: "Assignees", select_one: "Please select at least one person!", 
    set_due_today: "Set immediately due", pause_until: "Pause until", paused: "Paused until {date}" 
  },
  de: { 
    title: "Haushaltsliste", unknown: "Unbekannt", done: "Aufgabe erledigt!", saved: "Gespeichert", 
    deleted: "Gelöscht", confirm_delete: "Aufgabe wirklich löschen?", today: "Heute", 
    in_days: "in {days} Tage(n)", ago_days: "vor {days} Tage(n)", points: "Pkt.", 
    no_desc: "Keine Beschreibung", who_did_it: "Wer hat's gemacht?", fair_points: "Punkte werden fair geteilt.", 
    cancel: "Abbrechen", confirm: "Bestätigen", save: "Speichern", task: "Aufgabe", name_lbl: "Name", 
    desc_lbl: "Beschreibung (optional)", desc_placeholder: "Zusätzliche Infos...", 
    interval_lbl: "Tage (Intervall)", points_lbl: "Punkte (1-10)", icon_lbl: "Icon", 
    assignees_lbl: "Bearbeiter", select_one: "Bitte mindestens eine Person auswählen!", 
    set_due_today: "Sofort fällig setzen", pause_until: "Pausieren bis", paused: "Pausiert bis {date}" 
  }
};

/**
 * Make this card available in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-card",
  name: "Task Organizer Card",
  description: "A custom card to display and manage household tasks.",
  preview: true,
});

class TaskOrganizerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tasks = {}; 
    this.users = {};
    
    // Default colors: Green, Yellow/Orange, Red
    this.settings = { 
        color_done: '#4CAF50', 
        color_due: '#FFC107', 
        color_overdue: '#F44336', 
        overdue_days: 5 
    };
    
    this._dataLoaded = false; 
    this._unsubEvents = null;
    this.addEventListener('click', (ev) => this._handleCardClick(ev));
  }

  /**
   * Translates a given key based on the Home Assistant language.
   * * @param {string} key - The translation key.
   * @param {object} replace - Object with parameters to replace in string.
   * @returns {string} - The translated text.
   */
  localize(key, replace = null) {
    let lang = 'en';
    if (this._hass && this._hass.language) {
      lang = this._hass.language.substring(0, 2);
    }
    
    const dict = I18N_CARD[lang] || I18N_CARD['en'];
    let text = dict[key] || I18N_CARD['en'][key] || key;
    
    if (replace) { 
      for (const [k, v] of Object.entries(replace)) { 
        text = text.replace(`{${k}}`, v); 
      } 
    }
    return text;
  }

  static getLayoutOptions() { 
      return { grid_columns: 4, grid_rows: "auto", grid_min_columns: 1, grid_max_columns: 4 }; 
  }

  /**
   * Generate stub configuration for the Card Picker.
   */
  static getStubConfig() { 
      return { 
          type: "custom:task-organizer-card", 
          sort_by: "due_date", 
          sort_order: "default", 
          filter_by: "none" 
      }; 
  }

  setConfig(config) { 
      this._config = config; 
  }

  connectedCallback() { 
      if (this._hass && !this._unsubEvents) { 
          this._subscribeToUpdates(); 
      } 
  }

  disconnectedCallback() { 
      if (this._unsubEvents) { 
          this._unsubEvents.then(unsub => unsub()); 
          this._unsubEvents = null; 
      } 
  }

  async _subscribeToUpdates() { 
      if (!this._hass) {
          return;
      }
      this._unsubEvents = this._hass.connection.subscribeEvents(
          () => this._fetchData(), 
          "task_organizer_updated"
      ); 
  }

  set hass(hass) {
    this._hass = hass;
    if (!hass) {
        return;
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

  _fetchData() {
    this._hass.callWS({ type: 'task_organizer/get_data' }).then((data) => {
      this.tasks = data.tasks || {};
      if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
      }
      this._render();
    });
  }

  _handleCardClick(ev) {
    const path = ev.composedPath();
    const target = path.find(el => el.id?.startsWith('btn-') || el.classList?.contains('action-btn'));
    
    if (!target) {
        return;
    }
    
    ev.stopPropagation();
    const taskId = target.dataset?.id;

    if (target.id === 'btn-add-task') {
        this._openModal();
    } else if (target.classList?.contains('btn-complete')) {
        this._checkCompleteAction(taskId);
    } else if (target.classList?.contains('btn-edit')) {
        this._openModal(taskId);
    } else if (target.classList?.contains('btn-delete')) {
        this._deleteTask(taskId);
    } else if (target.id === 'btn-modal-cancel') {
        this._closeModal();
    } else if (target.id === 'btn-modal-save') {
        this._saveTask();
    } else if (target.id === 'btn-choice-cancel') {
        this._closeChoiceModal();
    } else if (target.id === 'btn-choice-confirm') {
        this._confirmCompletion();
    }
  }

  _checkCompleteAction(taskId) {
    const task = this.tasks[taskId];
    if (!task) {
        return;
    }
    
    let assignees = task.assignees;
    if (typeof assignees === 'string') {
        assignees = [assignees];
    }
    if (!assignees) {
        assignees = [];
    }

    if (assignees.length > 1) {
        this._openChoiceModal(taskId, assignees);
    } else {
      const user = assignees.length === 1 ? assignees : [this._hass.user.id];
      this._completeTask(taskId, user);
    }
  }

  _openChoiceModal(taskId, assignees) {
    this._currentTaskId = taskId;
    const currentUserId = this._hass.user.id;
    const container = this.shadowRoot.getElementById('choice-assignees');
    
    // Renders the list of assignees with checkboxes
    container.innerHTML = assignees.map(uid => {
      const isChecked = (uid === currentUserId) ? 'checked' : '';
      return `
        <label class="assignee-item" style="display: flex; align-items: center; gap: 10px; padding: 10px; cursor: pointer; border-bottom: 1px solid var(--divider-color);">
            <input type="checkbox" class="choice-cb" value="${uid}" ${isChecked}>
            <span>${this.users[uid] || this.localize('unknown')}</span>
        </label>`;
    }).join('');
    
    this.shadowRoot.getElementById('choice-modal').classList.add('open');
  }

  _confirmCompletion() {
    const selected = [];
    this.shadowRoot.querySelectorAll('.choice-cb:checked').forEach(cb => {
        selected.push(cb.value);
    });
    
    if (selected.length === 0) { 
        alert(this.localize('select_one')); 
        return; 
    }
    
    this._completeTask(this._currentTaskId, selected);
    this._closeChoiceModal();
  }

  _closeChoiceModal() { 
      this.shadowRoot.getElementById('choice-modal').classList.remove('open'); 
  }

  _completeTask(taskId, completedBy) { 
      this._hass.callWS({ 
          type: 'task_organizer/complete_task', 
          task_id: taskId, 
          completed_by: completedBy 
      }).then(() => { 
          this._showToast(this.localize('done')); 
          this._fetchData(); 
      }); 
  }

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

  _deleteTask(taskId) { 
      if (confirm(this.localize('confirm_delete'))) { 
          this._hass.callWS({ type: 'task_organizer/delete_task', task_id: taskId }).then(() => { 
              this._showToast(this.localize('deleted')); 
              this._fetchData(); 
          }); 
      } 
  }

  _openModal(taskId = null) {
    this._editingTaskId = taskId;
    const modal = this.shadowRoot.getElementById('task-modal');
    
    if (taskId && this.tasks[taskId]) {
        const t = this.tasks[taskId];
        this.shadowRoot.getElementById('f-name').value = t.name;
        this.shadowRoot.getElementById('f-description').value = t.description || "";
        this.shadowRoot.getElementById('f-interval').value = t.interval;
        this.shadowRoot.getElementById('f-complexity').value = t.complexity;
        this._currentIcon = t.icon || "mdi:broom";
        
        this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => {
            cb.checked = t.assignees && t.assignees.includes(cb.value);
        });
        
        this.shadowRoot.getElementById('f-due-today').checked = false;
        if (t.paused_until) {
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
        this.shadowRoot.getElementById('f-interval').value = 7;
        this.shadowRoot.getElementById('f-complexity').value = 5; 
        this._currentIcon = "mdi:broom";
        
        this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => {
            cb.checked = false;
        });
        
        this.shadowRoot.getElementById('f-due-today').checked = false;
        this.shadowRoot.getElementById('f-pause-cb').checked = false;
        this.shadowRoot.getElementById('f-pause-date').value = "";
        this.shadowRoot.getElementById('f-pause-date').disabled = true;
    }
    
    const picker = this.shadowRoot.getElementById('f-icon-picker');
    if (picker) { 
        picker.hass = this._hass; 
        picker.value = this._currentIcon; 
    }
    modal.classList.add('open');
  }

  _closeModal() { 
      this.shadowRoot.getElementById('task-modal').classList.remove('open'); 
  }

  _saveTask() {
    const assignees = [];
    this.shadowRoot.querySelectorAll('.assignee-cb:checked').forEach(cb => {
        assignees.push(cb.value);
    });
    
    const setDueToday = this.shadowRoot.getElementById('f-due-today').checked;
    const isPausedCb = this.shadowRoot.getElementById('f-pause-cb').checked;
    const pauseDateVal = this.shadowRoot.getElementById('f-pause-date').value;
    const pausedUntil = (isPausedCb && pauseDateVal) ? pauseDateVal : null;

    const payload = {
      name: this.shadowRoot.getElementById('f-name').value, 
      description: this.shadowRoot.getElementById('f-description').value,
      interval: parseInt(this.shadowRoot.getElementById('f-interval').value),
      complexity: parseInt(this.shadowRoot.getElementById('f-complexity').value), 
      icon: this.shadowRoot.getElementById('f-icon-picker').value,
      category: "Allgemein", 
      assignees: assignees,
      set_due_today: setDueToday,
      paused_until: pausedUntil
    };
    
    const type = this._editingTaskId ? 'task_organizer/edit_task' : 'task_organizer/add_task';
    if (this._editingTaskId) {
        payload.task_id = this._editingTaskId;
    }
    
    this._hass.callWS({ type, ...payload }).then(() => { 
        this._showToast(this.localize('saved')); 
        this._closeModal(); 
        this._fetchData(); 
    });
  }

  /**
   * Generates the custom CSS for the card view.
   */
  _getStyles() {
      return `
        <style>
          :host { display: block; width: 100%; height: 100%; } 
          ha-card { width: 100%; height: 100%; padding: 16px; display: flex; flex-direction: column; overflow-x: hidden; overflow-y: auto; position: relative; } 
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; } 
          .header span { font-size: 20px; font-weight: bold; } 
          .add-button { width: 38px; height: 38px; background: #2196F3 !important; color: white !important; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; } 
          .task-list { display: flex; flex-direction: column; gap: 10px; width: 100%; flex-grow: 1; } 
          .task-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; border-left: 6px solid var(--status-color); border: 1px solid var(--divider-color); background-color: color-mix(in srgb, var(--status-color), transparent 92%); transition: transform 0.2s; } 
          .task-item:hover { background-color: color-mix(in srgb, var(--status-color), transparent 85%); transform: translateX(2px); box-shadow: -2px 4px 8px rgba(0,0,0,0.1); } 
          .task-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; } 
          .task-text { flex: 1; min-width: 0; word-break: break-word; text-align: left; } 
          .task-title { font-weight: bold; margin: 0; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: help; } 
          .task-meta { font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; } 
          .assignees-icons { display: flex; margin-top: 6px; gap: 4px; } 
          .mini-avatar { width: 22px; height: 22px; border-radius: 50%; background: #999; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; text-transform: uppercase; box-shadow: 0 1px 3px rgba(0,0,0,0.2); } 
          .actions { display: flex; gap: 4px; flex-shrink: 0; } 
          .action-btn { background: none; border: none; padding: 6px; cursor: pointer; transition: transform 0.1s; } 
          .action-btn:hover { transform: scale(1.15); } 
          .btn-complete { color: #4CAF50 !important; } 
          .btn-edit { color: #2196F3 !important; } 
          .btn-delete { color: #F44336 !important; } 
          .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; } 
          .modal.open { display: flex; } 
          .modal-content { background: var(--card-background-color, white); padding: 20px; border-radius: 12px; width: 90%; max-width: 400px; max-height: 90vh; overflow-y: auto; } 
          .btn { padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; flex: 1; } 
          .form-label { font-size: 12px; font-weight: bold; color: var(--secondary-text-color); margin-bottom: 4px; display: block; } 
          .form-input { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid var(--divider-color); background: var(--primary-background-color); color: var(--primary-text-color); }
        </style>
      `;
  }

  _render() {
    if (!this._config || !this._hass) {
        return;
    }
    
    const filterBy = this._config.filter_by || 'none'; 
    const sortBy = this._config.sort_by || 'due_date';
    const sortOrder = this._config.sort_order || 'default';

    const nowForSort = new Date(); 
    nowForSort.setHours(0,0,0,0);
    const currentUserId = this._hass.user.id;

    // Filter Logic
    let taskArray = Object.values(this.tasks).filter(task => {
        const d = new Date(task.due_date); 
        d.setHours(0,0,0,0);
        
        const diff = Math.round((d - nowForSort) / (1000 * 60 * 60 * 24));
        const isPaused = task.paused_until && new Date(task.paused_until) > nowForSort;
        const overdueThreshold = -this.settings.overdue_days;

        if (filterBy === 'current_user') return task.assignees && task.assignees.includes(currentUserId);
        if (filterBy === 'due') return !isPaused && diff <= 0 && diff > overdueThreshold;
        if (filterBy === 'overdue') return !isPaused && diff <= overdueThreshold;
        if (filterBy === 'due_and_overdue') return !isPaused && diff <= 0;
        if (filterBy === 'active') return !isPaused;
        if (filterBy === 'inactive') return isPaused;
        if (filterBy === 'unassigned') return !task.assignees || task.assignees.length === 0;
        
        return true; 
    });
    
    // Sort Logic
    taskArray.sort((a, b) => {
      const aPaused = a.paused_until && new Date(a.paused_until) > nowForSort;
      const bPaused = b.paused_until && new Date(b.paused_until) > nowForSort;

      let cmp = 0;
      if (sortBy === 'points') {
          cmp = a.complexity - b.complexity;
      } else if (sortBy === 'assignee') {
          const aName = (a.assignees && a.assignees.length > 0) ? (this.users[a.assignees[0]] || 'z') : 'z';
          const bName = (b.assignees && b.assignees.length > 0) ? (this.users[b.assignees[0]] || 'z') : 'z';
          cmp = aName.localeCompare(bName);
      } else if (sortBy === 'alphabet') {
          cmp = a.name.localeCompare(b.name);
      } else { 
          if (aPaused && !bPaused) cmp = 1;
          else if (!aPaused && bPaused) cmp = -1;
          else cmp = new Date(a.due_date) - new Date(b.due_date);
      }

      if (sortOrder === 'desc') return -cmp;
      if (sortOrder === 'asc') return cmp;
      return cmp; 
    });

    const displayTitle = this._config.title || this.localize('title');

    // Generate Card HTML Structure
    let html = this._getStyles();
    html += `
      <ha-card>
        <div class="header">
            <span>${displayTitle}</span>
            <button class="add-button" id="btn-add-task"><ha-icon icon="mdi:plus"></ha-icon></button>
        </div>
        <div class="task-list">
    `;

    // Loop through tasks and render items
    taskArray.forEach(task => {
      const d = new Date(task.due_date); 
      d.setHours(0,0,0,0);
      const now = new Date(); 
      now.setHours(0,0,0,0);
      
      const diff = Math.round((d - now) / (1000 * 60 * 60 * 24));
      const isPaused = task.paused_until && new Date(task.paused_until) > nowForSort;
      
      let borderColor = this.settings.color_done;
      let timeText = this.localize('today');
      
      if (isPaused) {
        // Grey color for paused tasks
        borderColor = '#9e9e9e'; 
        timeText = this.localize('paused', {date: new Date(task.paused_until).toLocaleDateString()});
      } else {
        if (diff <= 0) borderColor = this.settings.color_due;
        if (diff <= -this.settings.overdue_days) borderColor = this.settings.color_overdue;
        
        if (diff > 0) timeText = this.localize('in_days', {days: diff});
        else if (diff < 0) timeText = this.localize('ago_days', {days: Math.abs(diff)});
      }
      
      let assigneesList = Array.isArray(task.assignees) ? task.assignees : (task.assignees ? [task.assignees] : []);
      const assigneeHtml = assigneesList.map(uid => `
          <div class="mini-avatar" title="${this.users[uid] || this.localize('unknown')}">
              ${(this.users[uid] || '?').charAt(0).toUpperCase()}
          </div>
      `).join('');

      const tooltipText = task.description ? task.description.replace(/"/g, '&quot;') : this.localize('no_desc');
      let itemStyle = `--status-color: ${borderColor};`;
      if (isPaused) {
          itemStyle += ` opacity: 0.6; filter: grayscale(0.8);`;
      }

      html += `
        <div class="task-item" style="${itemStyle}">
            <div class="task-info">
                <ha-icon icon="${task.icon || 'mdi:broom'}" style="flex-shrink: 0;"></ha-icon>
                <div class="task-text">
                    <p class="task-title" title="${tooltipText}">${task.name}</p>
                    <div class="task-meta">${timeText} • ${task.complexity} ${this.localize('points')}</div>
                    <div class="assignees-icons">${assigneeHtml}</div>
                </div>
            </div>
            <div class="actions">
                <button class="action-btn btn-complete" data-id="${task.id}"><ha-icon icon="mdi:check"></ha-icon></button>
                <button class="action-btn btn-edit" data-id="${task.id}"><ha-icon icon="mdi:pencil"></ha-icon></button>
                <button class="action-btn btn-delete" data-id="${task.id}"><ha-icon icon="mdi:delete"></ha-icon></button>
            </div>
        </div>
      `;
    });

    // Modals for Choice and Task Edit
    html += `
        </div>
        
        <div id="choice-modal" class="modal">
            <div class="modal-content">
                <h2 style="margin:0">${this.localize('who_did_it')}</h2>
                <p style="font-size:13px; color:gray; margin-bottom: 10px;">${this.localize('fair_points')}</p>
                <div id="choice-assignees"></div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn" style="background:#eee; color:#333;" id="btn-choice-cancel">${this.localize('cancel')}</button>
                    <button class="btn" style="background:#4CAF50; color:white;" id="btn-choice-confirm">${this.localize('confirm')}</button>
                </div>
            </div>
        </div>
        
        <div id="task-modal" class="modal">
            <div class="modal-content">
                <h2 style="margin:0">${this.localize('task')}</h2>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:15px;">
                    <div>
                        <label class="form-label">${this.localize('name_lbl')}</label>
                        <input type="text" id="f-name" class="form-input">
                    </div>
                    <div>
                        <label class="form-label">${this.localize('desc_lbl')}</label>
                        <input type="text" id="f-description" class="form-input" placeholder="${this.localize('desc_placeholder')}">
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label class="form-label">${this.localize('interval_lbl')}</label>
                            <input type="number" id="f-interval" class="form-input" min="1">
                        </div>
                        <div style="flex:1;">
                            <label class="form-label">${this.localize('points_lbl')}</label>
                            <input type="number" id="f-complexity" class="form-input" min="1" max="10">
                        </div>
                    </div>
                    <div>
                        <label class="form-label">${this.localize('icon_lbl')}</label>
                        <ha-icon-picker id="f-icon-picker"></ha-icon-picker>
                    </div>
                    <div>
                        <label class="form-label">${this.localize('assignees_lbl')}</label>
                        <div style="display:flex; flex-direction:column; gap:8px; padding:10px; border:1px solid var(--divider-color); border-radius:8px;">
                            ${Object.entries(this.users).map(([uid, name]) => `
                                <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                    <input type="checkbox" class="assignee-cb" id="cb-${uid}" value="${uid}">
                                    <span>${name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div style="margin-top: 10px; border-top: 1px solid var(--divider-color); padding-top: 10px;">
                        <label class="form-label" style="margin-bottom: 8px;">Fälligkeit & Pause</label>
                        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; margin-bottom: 10px;">
                            <input type="checkbox" id="f-due-today"> <span>${this.localize('set_due_today')}</span>
                        </label>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                                <input type="checkbox" id="f-pause-cb"> <span>${this.localize('pause_until')}</span>
                            </label>
                            <input type="date" id="f-pause-date" class="form-input" style="flex:1;" disabled>
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button class="btn" style="background:#eee; color:#333;" id="btn-modal-cancel">${this.localize('cancel')}</button>
                    <button class="btn" style="background:#2196F3; color:white;" id="btn-modal-save">${this.localize('save')}</button>
                </div>
            </div>
        </div>
      </ha-card>
    `;
    this.shadowRoot.innerHTML = html;
    
    // Setup logic after rendering DOM
    const picker = this.shadowRoot.getElementById('f-icon-picker');
    if (picker) { 
        picker.hass = this._hass; 
        picker.value = this._currentIcon; 
    }
    
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
  }
}
customElements.define('task-organizer-card', TaskOrganizerCard);