const _v = new URLSearchParams(import.meta.url.split('?')[1]).get('v') || Date.now();
const { localize } = await import(`./utils/i18n.js?v=${_v}`);
await import(`./modals/choice-modal.js?v=${_v}`);
await import(`./modals/subtask-modal.js?v=${_v}`);
await import(`./modals/task-modal.js?v=${_v}`);
await import(`./modals/pause-modal.js?v=${_v}`);

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "task-organizer-kanban")) {
    window.customCards.push({
      type: "task-organizer-kanban",
      name: "Task Organizer: Kanban Board",
      description: "A custom Kanban board card to display and manage household tasks.",
      preview: true,
    });
}

class TaskOrganizerKanban extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tasks = {}; 
    this.templates = {};
    this.users = {};
    
    this.settings = { 
        color_done: 'var(--success-color, #4CAF50)', 
        color_due: 'var(--warning-color, #FFC107)', 
        color_overdue: 'var(--error-color, #F44336)', 
        overdue_days: 5 
    };
    
    this._dataLoaded = false; 
    this._skeletonBuilt = false;
    this._unsubEvents = null;

    this.addEventListener('task-saved', (e) => this._onTaskSaved(e));
    this.addEventListener('proceed-to-assignee', (e) => this._proceedToAssigneeCheck(e.detail.taskId));
    this.addEventListener('subtasks-saved', (e) => this._fetchData());
    this.addEventListener('task-complete', (e) => this._onTaskComplete(e));
    this.addEventListener('assign-to', (e) => this._onAssignTo(e));
    this.addEventListener('show-toast', (e) => this._showToast(e.detail.message));
  }

  static _localize(hass, key, replace = null) {
    return localize(hass, key, replace, false);
  }

  localize(key, replace = null) {
    return TaskOrganizerKanban._localize(this._hass, key, replace);
  }

  static getLayoutOptions() { 
      return { grid_columns: 4, grid_rows: "auto", grid_min_columns: 1, grid_max_columns: 4 }; 
  }

  static getStubConfig(hass) { 
      return { 
          type: "custom:task-organizer-kanban", 
          title: "Kanban Board",
          filter_by: "none"
      }; 
  }

  _normalize(str) {
    if (str === null || str === undefined) return "";
    return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  }

  static getConfigElement() {
    return document.createElement("task-organizer-kanban-editor");
  }

  setConfig(config) { 
      if (!config) throw new Error("Invalid configuration");
      this._config = config; 
      this._skeletonBuilt = false; 
      if (this._hass) this._render();
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
      if (!this._hass) return;
      this._unsubEvents = this._hass.connection.subscribeEvents(
          () => this._fetchData(), 
          "task_organizer_updated"
      ); 
  }

  set hass(hass) {
    this._hass = hass;
    if (!hass) return;
    
    if (!this._skeletonBuilt) {
        this._render();
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
      this.templates = data.templates || {};
      if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
      }
      this._renderBoard();
    });
  }

  _onTaskSaved(e) {
    const { payload, editingTaskId, completeAfterSave } = e.detail;
    const type = editingTaskId ? 'task_organizer/edit_task' : 'task_organizer/add_task';
    if (editingTaskId) payload.task_id = editingTaskId;
    this._hass.callWS({ type, ...payload }).then(() => {
        this._showToast(this.localize('saved'));
        this._fetchData();
        if (completeAfterSave && editingTaskId) {
            this._checkCompleteAction(editingTaskId);
        }
    }).catch(err => {
        console.error("TaskOrganizer: Error saving", err);
        this._showToast("Error: " + (err.message || "Unknown error"));
    });
  }

  _onTaskComplete(e) {
    const { taskId, userPoints } = e.detail;
    const completedBy = Object.keys(userPoints);
    this._completeTask(taskId, completedBy, userPoints);
  }

  _onAssignTo(e) {
    const { taskId, userId } = e.detail;
    this._hass.callWS({
        type: 'task_organizer/complete_task',
        task_id: taskId,
        completed_by: [userId]
    }).then(() => {
        this._fetchData();
        this._showToast(this.localize('done'));
    });
  }

  _checkCompleteAction(taskId) {
    const task = this.tasks[taskId];
    if (!task) return;

    if (task.subtasks && task.subtasks.length > 0) {
        this.shadowRoot.getElementById('modal-subtask').open(taskId, this.tasks[taskId], this._hass);
    } else {
        this._proceedToAssigneeCheck(taskId);
    }
  }

  _proceedToAssigneeCheck(taskId) {
    const task = this.tasks[taskId];
    const currentUserId = this._hass.user?.id;
    let assignees = task.assignees || [];
    if (typeof assignees === 'string') assignees = [assignees];

    const isOnlyMe = assignees.length === 1 && assignees[0] === currentUserId;

    if (isOnlyMe) {
      this._completeTask(taskId, [currentUserId], { [currentUserId]: 100 });
    } else {
      this.shadowRoot.getElementById('modal-choice').open(taskId, this.tasks[taskId], this.users, this._hass, this.settings);
    }
  }

  _completeTask(taskId, completedBy, userPoints) {
    const payload = {
        type: 'task_organizer/complete_task',
        task_id: taskId,
        completed_by: completedBy
    };
    if (userPoints) {
        payload.points_distribution = userPoints;
    }
    this._hass.callWS(payload).then(() => {
        this._fetchData();
        this._showToast(this.localize('done'));
    }).catch(err => {
        console.error("TaskOrganizer: Error completing task", err);
        this._showToast("Error: " + (err.message || "Unknown error"));
    });
  }

  _showToast(message) {
    let toast = this.shadowRoot.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        this.shadowRoot.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = "toast show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
  }

  _deleteTask(taskId) {
    if (confirm(this.localize('confirm_delete'))) {
        this._hass.callWS({ type: 'task_organizer/delete_task', task_id: taskId }).then(() => {
            this._showToast(this.localize('deleted'));
            this._fetchData();
        });
    }
  }

  _getTaskState(task) {
    const nowForSort = new Date(); 
    nowForSort.setHours(0,0,0,0);
    
    const d = new Date(task.due_date); 
    d.setHours(0,0,0,0);
    
    const diff = Math.round((d - nowForSort) / (1000 * 60 * 60 * 24));
    let isPaused = task.paused_until && new Date(task.paused_until) > nowForSort;
    if (task.active_months && task.active_months.length > 0) {
        const currentMonth = nowForSort.getMonth() + 1;
        if (!task.active_months.includes(currentMonth)) {
            isPaused = true;
        }
    }
    
    const overdueThreshold = (task.override_overdue_days !== null && task.override_overdue_days !== undefined)
        ? task.override_overdue_days : this.settings.overdue_days;
    const overdueDiff = -overdueThreshold;

    if (isPaused) return 'paused';
    
    // Check in progress (has subtasks and at least one is done, but not all)
    // Wait, user said: "bei in progress soll das verschieben nur möglich sein wenn es subtasks gibt."
    // Let's classify as in_progress if any subtask is done. If they dragged it there, we shouldn't rely solely on subtask done state.
    // Actually, we don't save a specific 'in_progress' state. We just use subtasks.
    // So "In Progress" column shows tasks with subtasks that are partially done? 
    // Wait, the user said: "Tasks mit Subtasks, von denen mindestens eins abgehakt ist, aber nicht alle, sind In Progress." (Well, they said option b).
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const someSubtasksDone = hasSubtasks && task.subtasks.some(st => st.done);
    const allSubtasksDone = hasSubtasks && task.subtasks.every(st => st.done);
    
    // Future due tasks that are recurring are "Completed" (next occurrence)
    if (diff > 0) return 'completed';
    
    if (someSubtasksDone && !allSubtasksDone) return 'in_progress';
    
    if (diff <= 0 && diff > overdueDiff) return 'due';
    
    return 'overdue';
  }

  _render() {
    if (!this._skeletonBuilt) {
        this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: flex;
            flex-direction: column;
            --mdc-theme-primary: var(--primary-color);
            --mdc-theme-secondary: var(--accent-color);
            width: 100%;
            height: 100%;
            min-height: 0;
            margin: 0 auto;
          }
          ha-card {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 16px;
            box-sizing: border-box;
          }
          .kanban-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-shrink: 0; flex-wrap: wrap; gap: 8px; }
          .kanban-title { font-size: 20px; font-weight: bold; color: var(--primary-text-color); }
          
          .kanban-board {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            overflow-y: visible;
            padding-bottom: 8px;
            align-items: stretch;
            zoom: var(--kanban-zoom, 1.0);
          }
          
          .kanban-column {
            flex: 1 0 auto;
            width: 270px;
            min-width: 270px;
            max-width: 270px;
            background: rgba(var(--rgb-card-background-color), 0.5);
            border-radius: var(--ha-card-border-radius, 12px);
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          
          .kanban-column-header {
            font-size: 15px;
            font-weight: 500;
            color: var(--primary-text-color);
            padding-bottom: 8px;
            border-bottom: 2px solid var(--divider-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
          }

          .kanban-column-count {
            background: var(--divider-color);
            border-radius: 12px;
            padding: 2px 8px;
            font-size: 11px;
          }

          .kanban-column.overdue .kanban-column-header { border-bottom-color: var(--error-color); }
          .kanban-column.due .kanban-column-header { border-bottom-color: var(--warning-color); }
          .kanban-column.in_progress .kanban-column-header { border-bottom-color: var(--info-color, #2196f3); }
          .kanban-column.completed .kanban-column-header { border-bottom-color: var(--success-color); }
          .kanban-column.paused .kanban-column-header { border-bottom-color: var(--secondary-text-color); }

          .kanban-column-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .task-card {
            background: var(--card-background-color);
            border-radius: 6px;
            padding: 6px 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            cursor: grab;
            user-select: none;
            display: flex;
            flex-direction: column;
            gap: 4px;
            border: 1px solid var(--divider-color);
            border-left: 6px solid var(--status-color);
            transition: transform 0.2s, background-color 0.2s;
            box-sizing: border-box;
          }
          
          .task-card:active { cursor: grabbing; }
          .task-card.dragging { opacity: 0.5; }
          .column-drag-over { background: rgba(var(--rgb-primary-color), 0.1); }
          .task-card:hover { background-color: color-mix(in srgb, var(--status-color), transparent 95%); transform: translateX(2px); box-shadow: -2px 4px 8px rgba(0,0,0,0.1); }
          
          .task-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; }
          .task-title { font-weight: bold; font-size: 13px; color: var(--primary-text-color); display: flex; align-items: center; gap: 4px; overflow: hidden; }
          .task-title span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .task-icon { color: var(--primary-text-color); --mdc-icon-size: 18px; flex-shrink: 0; }
          
          .task-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 11px; color: var(--secondary-text-color); margin-top: 0px; }
          
          .assignees-icons { display: flex; margin-top: 6px; gap: 4px; }
          .mini-avatar { width: 20px; height: 20px; border-radius: 50%; background: var(--secondary-text-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; text-transform: uppercase; box-shadow: 0 1px 3px rgba(0,0,0,0.2); cursor: help; }
          
          .task-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 4px; }
          .task-actions { display: flex; gap: 4px; flex-shrink: 0; }
          .action-btn { background: transparent; border: none; cursor: pointer; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; color: var(--secondary-text-color); }
          .action-btn:hover { background-color: var(--secondary-background-color); color: var(--primary-text-color); }
          .action-btn ha-icon { --mdc-icon-size: 18px; }
          .btn-complete { color: var(--success-color, #4CAF50) !important; } 
          .btn-edit { color: var(--info-color, #2196F3) !important; } 
          .btn-delete { color: var(--error-color, #F44336) !important; } 
          
          .header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
          .icon-button { background: transparent; border: none; cursor: pointer; color: var(--primary-text-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transition: background-color 0.2s, transform 0.1s; }
          .icon-button:hover { background-color: var(--secondary-background-color); }
          .add-button { background: var(--primary-color, #2196F3) !important; color: white !important; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
          .add-button:hover { background: var(--dark-primary-color, #1976D2) !important; transform: scale(1.05); }
          
          .search-container { display: none; margin-right: 4px; }
          .search-container.visible { display: block; animation: slideIn 0.3s ease-out; }
          .search-input-wrapper { display: flex; align-items: center; background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 20px; overflow: hidden; height: 36px; }
          .search-input { background: transparent; border: none; color: var(--primary-text-color); padding: 0 8px; outline: none; width: 150px; font-family: inherit; font-size: 14px; }
          @keyframes slideIn { from { width: 0; opacity: 0; } to { width: 190px; opacity: 1; } }
          
          .toast { visibility: hidden; min-width: 250px; background-color: #333; color: #fff; text-align: center; border-radius: 4px; padding: 12px; position: fixed; z-index: 9999; left: 50%; bottom: 30px; transform: translateX(-50%); font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
          .toast.show { visibility: visible; animation: fadein 0.5s, fadeout 0.5s 2.5s; }
          @keyframes fadein { from {bottom: 0; opacity: 0;} to {bottom: 30px; opacity: 1;} }
          @keyframes fadeout { from {bottom: 30px; opacity: 1;} to {bottom: 0; opacity: 0;} }
        </style>
        
        <ha-card>
            <div class="kanban-header">
                <div class="kanban-title">${this._config?.title || this.localize('title')}</div>
                <div class="header-actions">
                    <div class="search-container" id="search-container">
                        <div class="search-input-wrapper">
                            <ha-icon icon="mdi:magnify" style="--mdc-icon-size: 18px; color: var(--secondary-text-color); margin-left: 8px;"></ha-icon>
                            <input type="text" id="search-field" placeholder="${this.localize('search_placeholder') || 'Suchen...'}" class="search-input">
                            <button class="icon-button" id="btn-clear-search" style="width: 24px; height: 24px; margin-right: 4px;" title="${this.localize('clear')}"><ha-icon icon="mdi:close" style="--mdc-icon-size: 16px;"></ha-icon></button>
                        </div>
                    </div>
                    ${this._config?.show_search !== false ? `<button class="icon-button" id="btn-search-toggle" title="${this.localize('search_btn') || 'Suchen'}"><ha-icon icon="mdi:magnify"></ha-icon></button>` : ''}
                    ${this._config?.show_add !== false ? `<button class="icon-button add-button" id="btn-add-task" title="${this.localize('add_task_btn')}"><ha-icon icon="mdi:plus"></ha-icon></button>` : ''}
                </div>
            </div>

            <div class="kanban-board" id="kanban-board">
                <!-- Columns will be rendered here -->
            </div>
            
            <task-organizer-task-modal id="modal-task"></task-organizer-task-modal>
            <task-organizer-choice-modal id="modal-choice"></task-organizer-choice-modal>
            <task-organizer-subtask-modal id="modal-subtask"></task-organizer-subtask-modal>
            <task-organizer-pause-modal id="modal-pause"></task-organizer-pause-modal>
        </ha-card>
        `;
        
        if (this._config?.show_add !== false) {
            this.shadowRoot.getElementById('btn-add-task').addEventListener('click', () => {
                this.shadowRoot.getElementById('modal-task').open(null, null, this.templates, this.users, this._hass);
            });
        }
        
        if (this._config?.show_search !== false) {
            this.shadowRoot.getElementById('btn-search-toggle').addEventListener('click', () => {
                if (this._searchVisible) {
                    this.shadowRoot.getElementById('search-field').value = '';
                    this._searchTerm = '';
                    this._renderBoard();
                }
                this._searchVisible = !this._searchVisible;
                this._updateSearchVisibility();
            });
            this.shadowRoot.getElementById('btn-clear-search').addEventListener('click', () => {
                this.shadowRoot.getElementById('search-field').value = '';
                this._searchTerm = '';
                this._renderBoard();
                this._searchVisible = false;
                this._updateSearchVisibility();
            });
            this.shadowRoot.getElementById('search-field').addEventListener('input', (e) => {
                this._searchTerm = e.target.value;
                this._renderBoard();
            });
        }

        this._skeletonBuilt = true;
    }
    this._updateSearchVisibility();
    this.style.setProperty('--kanban-zoom', this._config.zoom !== undefined ? this._config.zoom : 1.0);
    if (this._dataLoaded) {
        this._renderBoard();
    }
  }

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

  _renderBoard() {
    const board = this.shadowRoot.getElementById('kanban-board');
    if (!board) return;

    const isDarkMode = this._hass && this._hass.themes && this._hass.themes.darkMode;
    const themeSuffix = isDarkMode ? 'dark' : 'light';
    
    const configColorDone = this.settings[`color_done_${themeSuffix}`] || this.settings.color_done || 'var(--success-color, #4CAF50)';
    const configColorDue = this.settings[`color_due_${themeSuffix}`] || this.settings.color_due || 'var(--warning-color, #FFC107)';
    const configColorOverdue = this.settings[`color_overdue_${themeSuffix}`] || this.settings.color_overdue || 'var(--error-color, #F44336)';
    const configColorPaused = this.settings[`color_paused_${themeSuffix}`] || this.settings.color_paused || 'var(--disabled-text-color, #9e9e9e)';
    const configColorInProgress = this.settings[`color_in_progress_${themeSuffix}`] || this.settings.color_in_progress || 'var(--info-color, #2196f3)';

    const colColors = {
        'due_and_overdue': configColorOverdue,
        'overdue': configColorOverdue,
        'due': configColorDue,
        'in_progress': configColorInProgress,
        'paused': configColorPaused,
        'completed': configColorDone
    };

    let filters = [];
    if (Array.isArray(this._config.filter_by)) {
        filters = this._config.filter_by;
    } else if (typeof this._config.filter_by === 'string' && this._config.filter_by !== 'none') {
        filters = this._config.filter_by.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }

    let activeCols = [];
    if (this._config.visible_columns) {
        activeCols = this._config.visible_columns.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } else {
        activeCols = ['due_and_overdue', 'in_progress', 'completed'];
    }

    const columns = {};
    
    let dueAndOverdueLabel = this.localize('kanban_due_and_overdue');
    if (dueAndOverdueLabel === 'kanban_due_and_overdue') {
        dueAndOverdueLabel = 'Fällige & überfällige Aufgaben';
    }

    const allCols = {
        'due_and_overdue': { id: 'due_and_overdue', label: dueAndOverdueLabel, tasks: [] },
        'overdue': { id: 'overdue', label: this.localize('kanban_overdue'), tasks: [] },
        'due': { id: 'due', label: this.localize('kanban_due') || 'Due Tasks', tasks: [] },
        'in_progress': { id: 'in_progress', label: this.localize('kanban_in_progress') || 'In Progress', tasks: [] },
        'paused': { id: 'paused', label: this.localize('kanban_paused') || 'Paused', tasks: [] },
        'completed': { id: 'completed', label: this.localize('kanban_completed') || 'Completed', tasks: [] }
    };
    activeCols.forEach(colId => { if (allCols[colId]) columns[colId] = allCols[colId]; });

    const currentUserId = this._hass.user.id;
    const nowForFilter = new Date(); 
    nowForFilter.setHours(0,0,0,0);

    Object.values(this.tasks).forEach(task => {
        const d = new Date(task.due_date); 
        d.setHours(0,0,0,0);
        const diff = Math.round((d - nowForFilter) / (1000 * 60 * 60 * 24));
        let isPaused = task.paused_until && new Date(task.paused_until) > nowForFilter;
        if (task.active_months && task.active_months.length > 0) {
            const currentMonth = nowForFilter.getMonth() + 1;
            if (!task.active_months.includes(currentMonth)) {
                isPaused = true;
            }
        }
        const overdueThreshold = (task.override_overdue_days !== null && task.override_overdue_days !== undefined)
            ? task.override_overdue_days : this.settings.overdue_days;
        const overdueDiff = -overdueThreshold;

        const isCurrentUser = task.assignees && task.assignees.includes(currentUserId);
        const isAssigned = task.assignees && task.assignees.length > 0;
        const isOnetime = task.interval === 0;
        const isDone = !isPaused && diff > 0;
        const isDue = !isPaused && diff <= 0 && diff > overdueDiff;
        const isOverdue = !isPaused && diff <= overdueDiff;

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
            else if (filterName === 'paused') match = isPaused;
            else if (filterName === 'onetime') match = isOnetime;
            else if (filterName.startsWith('room:')) {
                const targetArea = this._normalize(filterName.substring(5));
                match = (this._normalize(task.area) === targetArea);
            } else match = true;

            if (negate) match = !match;
            if (!match) { keep = false; break; }
        }
        
        if (keep && this._searchTerm) {
            const term = this._searchTerm.toLowerCase();
            const nameMatch = task.name?.toLowerCase().includes(term);
            const descMatch = task.description?.toLowerCase().includes(term);
            if (!nameMatch && !descMatch) keep = false;
        }

        if (keep) {
            let state = this._getTaskState(task);
            
            // If task is due/overdue, we decide which column it goes to based on config
            if (state === 'due' || state === 'overdue') {
                if (columns['due_and_overdue']) {
                    columns['due_and_overdue'].tasks.push(task);
                }
                if (columns[state]) {
                    columns[state].tasks.push(task);
                }
            } else {
                if (columns[state]) columns[state].tasks.push(task);
            }
        }
    });

    // Sort tasks in each column
    const sortBy = this._config.sort_by || 'due_date';
    const sortOrder = this._config.sort_order || 'default';

    const nowForSort = new Date(); 
    nowForSort.setHours(0,0,0,0);
    
    Object.values(columns).forEach(col => {
        col.tasks.sort((a, b) => {
            let aPaused = a.paused_until && new Date(a.paused_until) > nowForSort;
            if (!aPaused && a.active_months && a.active_months.length > 0) {
                aPaused = !a.active_months.includes(nowForSort.getMonth() + 1);
            }
            let bPaused = b.paused_until && new Date(b.paused_until) > nowForSort;
            if (!bPaused && b.active_months && b.active_months.length > 0) {
                bPaused = !b.active_months.includes(nowForSort.getMonth() + 1);
            }

            const isAPaused = !!aPaused;
            const isBPaused = !!bPaused;
            if (isAPaused !== isBPaused) {
                return isAPaused ? 1 : -1;
            }

            let cmp = 0;
            if (sortBy === 'points') cmp = a.complexity - b.complexity;
            else if (sortBy === 'assignee') {
                const aName = (a.assignees && a.assignees.length > 0) ? (this.users[a.assignees[0]] || 'z') : 'z';
                const bName = (b.assignees && b.assignees.length > 0) ? (this.users[b.assignees[0]] || 'z') : 'z';
                cmp = aName.localeCompare(bName);
            } 
            else if (sortBy === 'alphabet') cmp = a.name.localeCompare(b.name);
            else { 
                cmp = new Date(a.due_date) - new Date(b.due_date);
            }

            if (sortOrder === 'desc') return -cmp;
            if (sortOrder === 'asc') return cmp;
            return cmp; 
        });
    });

    board.innerHTML = Object.values(columns).map(col => `
        <div class="kanban-column ${col.id}" data-column="${col.id}">
            <div class="kanban-column-header" style="border-bottom-color: ${colColors[col.id] || 'var(--primary-color)'};">
                <span>${col.label}</span>
                <span class="kanban-column-count">${col.tasks.length}</span>
            </div>
            <div class="kanban-column-content" data-column="${col.id}">
                ${col.tasks.map(task => this._renderTaskCard(task, col.id)).join('')}
            </div>
        </div>
    `).join('');

    this._attachDragAndDropListeners();
    this._attachTaskActionListeners();
  }

  _renderTaskCard(task, state) {
    const isDarkMode = this._hass && this._hass.themes && this._hass.themes.darkMode;
    const themeSuffix = isDarkMode ? 'dark' : 'light';
    
    const configColorDone = this.settings[`color_done_${themeSuffix}`] || this.settings.color_done || 'var(--success-color, #4CAF50)';
    const configColorDue = this.settings[`color_due_${themeSuffix}`] || this.settings.color_due || 'var(--warning-color, #FFC107)';
    const configColorOverdue = this.settings[`color_overdue_${themeSuffix}`] || this.settings.color_overdue || 'var(--error-color, #F44336)';
    const configColorPaused = this.settings[`color_paused_${themeSuffix}`] || this.settings.color_paused || 'var(--disabled-text-color, #9e9e9e)';
    const configColorInProgress = this.settings[`color_in_progress_${themeSuffix}`] || this.settings.color_in_progress || 'var(--info-color, #2196f3)';
    
    const transpDone = this.settings[`transparency_done_${themeSuffix}`] !== undefined ? this.settings[`transparency_done_${themeSuffix}`] : 8;
    const transpDue = this.settings[`transparency_due_${themeSuffix}`] !== undefined ? this.settings[`transparency_due_${themeSuffix}`] : 8;
    const transpOverdue = this.settings[`transparency_overdue_${themeSuffix}`] !== undefined ? this.settings[`transparency_overdue_${themeSuffix}`] : 8;
    const transpPaused = this.settings[`transparency_paused_${themeSuffix}`] !== undefined ? this.settings[`transparency_paused_${themeSuffix}`] : 8;
    const transpInProgress = this.settings[`transparency_in_progress_${themeSuffix}`] !== undefined ? this.settings[`transparency_in_progress_${themeSuffix}`] : 8;

    let borderColor = configColorDone;
    let transparency = transpDone;
    let timeText = this.localize('today');
    
    const now = new Date(); now.setHours(0,0,0,0);
    const d = new Date(task.due_date); d.setHours(0,0,0,0);
    const diff = Math.round((d - now) / (1000 * 60 * 60 * 24));
    let isPaused = task.paused_until && new Date(task.paused_until) > now;
    if (task.active_months && task.active_months.length > 0) {
        if (!task.active_months.includes(now.getMonth() + 1)) isPaused = true;
    }
    const overdueThreshold = (task.override_overdue_days !== null && task.override_overdue_days !== undefined) ? task.override_overdue_days : this.settings.overdue_days;

    if (isPaused) {
      borderColor = configColorPaused;
      transparency = transpPaused;
      let isPausedByDate = task.paused_until && new Date(task.paused_until) > now;
      if (isPausedByDate) {
          timeText = this.localize('paused', {date: new Date(task.paused_until).toLocaleDateString()});
      } else {
          timeText = this.localize('seasonal_pause');
      }
    } else {
      if (diff <= 0) { borderColor = configColorDue; transparency = transpDue; }
      if (diff <= -overdueThreshold) { borderColor = configColorOverdue; transparency = transpOverdue; }
      if (diff > 0) timeText = this.localize('in_days', {days: diff});
      else if (diff < 0) timeText = this.localize('ago_days', {days: Math.abs(diff)});
    }
    
    if (state === 'in_progress') { borderColor = configColorInProgress; transparency = transpInProgress; }
    if (state === 'completed') { borderColor = configColorDone; transparency = transpDone; }

    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    let subtaskTooltip = "";
    if (hasSubtasks) {
        const subtaskList = task.subtasks.map(st => `${st.done ? '✓' : '○'} ${st.title}`).join('&#10;');
        subtaskTooltip = `${this.localize('subtasks')}:&#10;${subtaskList}`;
    }

    const descTooltip = task.description ? task.description.replace(/"/g, '&quot;') : "";
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

    return `
        <div class="task-card state-${state}" draggable="true" data-id="${task.id}" data-has-subtasks="${hasSubtasks}" style="--status-color: ${borderColor};">
            <div class="task-header">
                <div class="task-title">
                    <span ${descTooltip ? `title="${descTooltip}"` : 'style="cursor: default;"'}>${task.name}</span>
                    ${task.subtasks?.length > 0 ? `<ha-icon icon="mdi:book-multiple-outline" style="--mdc-icon-size: 14px; flex-shrink: 0; opacity: 0.7;" title="${subtaskTooltip}"></ha-icon>` : ''}
                    ${task.interval === 0 ? `<ha-icon icon="mdi:numeric-1-circle-outline" style="--mdc-icon-size: 14px; flex-shrink: 0; opacity: 0.7;" title="${this.localize('onetime')}"></ha-icon>` : ''}
                    ${task.images?.length > 0 ? `<ha-icon icon="mdi:paperclip" style="--mdc-icon-size: 14px; flex-shrink: 0; opacity: 0.7;" title="Attachments: ${task.images.length}"></ha-icon>` : ''}
                </div>
                <ha-icon class="task-icon" icon="${task.icon || 'mdi:checkbox-marked-circle-outline'}"></ha-icon>
            </div>
            <div class="task-meta">
                ${timeText} • ${task.complexity} ${this.localize('points')}${areaName ? ' • ' + areaName : ''}
            </div>
            <div class="task-footer">
                <div class="assignees-icons">${assigneeHtml}</div>
                <div class="task-actions">
                    <button class="action-btn btn-complete" data-id="${task.id}" title="${this.localize('done')}"><ha-icon icon="mdi:check"></ha-icon></button>
                    ${this._config?.show_edit !== false ? `<button class="action-btn btn-edit" data-id="${task.id}" title="${this.localize('show_edit_lbl')}"><ha-icon icon="mdi:pencil"></ha-icon></button>` : ''}
                    ${this._config?.show_delete !== false ? `<button class="action-btn btn-delete" data-id="${task.id}" title="${this.localize('show_delete_lbl')}"><ha-icon icon="mdi:delete"></ha-icon></button>` : ''}
                </div>
            </div>
        </div>
    `;
  }

  _attachTaskActionListeners() {
    this.shadowRoot.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            this.shadowRoot.getElementById('modal-task').open(taskId, this.tasks[taskId], this.templates, this.users, this._hass);
        });
    });
    this.shadowRoot.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            this._deleteTask(e.currentTarget.dataset.id);
        });
    });
    this.shadowRoot.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            this._checkCompleteAction(e.currentTarget.dataset.id);
        });
    });
  }

  _attachDragAndDropListeners() {
    const cards = this.shadowRoot.querySelectorAll('.task-card');
    const columns = this.shadowRoot.querySelectorAll('.kanban-column');

    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.id);
            e.dataTransfer.setData('hasSubtasks', card.dataset.hasSubtasks);
            this._draggingTaskId = card.dataset.id;
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            this._draggingTaskId = null;
            card.classList.remove('dragging');
            columns.forEach(col => col.classList.remove('column-drag-over'));
        });
    });

    columns.forEach(col => {
        col.addEventListener('dragover', (e) => {
            const targetCol = col.dataset.column;
            if (this._draggingTaskId && this.tasks[this._draggingTaskId]) {
                const task = this.tasks[this._draggingTaskId];
                const draggedState = this._getTaskState(task);
                const dueStates = ['due', 'overdue', 'due_and_overdue'];
                
                // Block dropping into the same state it is already in
                if (draggedState === targetCol || (dueStates.includes(draggedState) && dueStates.includes(targetCol))) {
                    return;
                }
                
                // Block dropping tasks without subtasks into in_progress
                if (targetCol === 'in_progress') {
                    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                    if (!hasSubtasks) {
                        return;
                    }
                }
            }

            e.preventDefault();
            col.classList.add('column-drag-over');
        });

        col.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('column-drag-over');
        });

        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.classList.remove('column-drag-over');
            
            const taskId = e.dataTransfer.getData('text/plain') || this._draggingTaskId;
            const hasSubtasks = e.dataTransfer.getData('hasSubtasks') === 'true';
            const targetCol = col.dataset.column;
            
            this._handleDrop(taskId, targetCol, hasSubtasks);
        });
    });
  }

  _handleDrop(taskId, targetCol, hasSubtasks) {
    if (!taskId || !this.tasks[taskId]) return;
    const task = this.tasks[taskId];

    if (targetCol === 'due' || targetCol === 'overdue' || targetCol === 'due_and_overdue') {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        
        this._hass.callWS({ 
            type: 'task_organizer/edit_task', 
            task_id: taskId, 
            custom_due_date: `${yyyy}-${mm}-${dd}T00:00:00`,
            paused_until: null
        }).then(() => {
            this._fetchData();
        }).catch(err => {
            console.error("TaskOrganizer: Error dropping task to due", err);
            this._showToast("Error: " + (err.message || "Unknown error"));
        });
    } 
    else if (targetCol === 'paused') {
        this.shadowRoot.getElementById('modal-pause').open(taskId, this._hass);
    }
    else if (targetCol === 'in_progress') {
        if (!hasSubtasks) {
            this._showToast("Nur Aufgaben mit Unteraufgaben können hierhin verschoben werden.");
            return;
        }
        this.shadowRoot.getElementById('modal-subtask').open(taskId, task, this._hass);
    }
    else if (targetCol === 'completed') {
        this._checkCompleteAction(taskId);
    }
  }
}

try { customElements.define('task-organizer-kanban', TaskOrganizerKanban); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }

// Simple GUI Editor for Kanban Card
class TaskOrganizerKanbanEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  localize(key) {
    return TaskOrganizerKanban._localize(this._hass, key);
  }

  render() {
    if (!this._config || !this._hass) return;
    if (this._rendered) {
        this._updateUI();
        return;
    }
    
    this.innerHTML = `
      <div class="card-config">
        <ha-input label="Title" value="${this._config.title || this.localize('title')}" configValue="title"></ha-input>
        <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 16px;">
          <ha-formfield label="Show Add Button">
            <ha-checkbox ${this._config.show_add !== false ? 'checked' : ''} configValue="show_add"></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="Show Edit Button">
            <ha-checkbox ${this._config.show_edit !== false ? 'checked' : ''} configValue="show_edit"></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="Show Delete Button">
            <ha-checkbox ${this._config.show_delete !== false ? 'checked' : ''} configValue="show_delete"></ha-checkbox>
          </ha-formfield>
          <ha-formfield label="Show Search Button">
            <ha-checkbox ${this._config.show_search !== false ? 'checked' : ''} configValue="show_search"></ha-checkbox>
          </ha-formfield>
        </div>
        <ha-input label="Visible Columns (e.g. due_and_overdue, overdue, due, in_progress, paused, completed)" value="${this._config.visible_columns || 'due_and_overdue, in_progress, completed'}" configValue="visible_columns" style="width: 100%; margin-top: 16px;"></ha-input>
        <ha-input label="Sort By (e.g. due_date, points, assignee, alphabet)" value="${this._config.sort_by || 'due_date'}" configValue="sort_by" style="width: 100%; margin-top: 16px;"></ha-input>
        <ha-input label="Sort Order (e.g. default, asc, desc)" value="${this._config.sort_order || 'default'}" configValue="sort_order" style="width: 100%; margin-top: 8px;"></ha-input>
        <ha-input label="Filter By (e.g. !paused, due, assigned)" value="${this._config.filter_by || ''}" configValue="filter_by" style="width: 100%; margin-top: 16px;"></ha-input>
        
        <div style="margin-top: 16px; display: flex; align-items: center; gap: 16px;">
          <span style="min-width: 60px;">${this.localize('zoom_lbl') === 'zoom_lbl' ? 'Zoom' : this.localize('zoom_lbl')}:</span>
          <input type="range" min="0.5" max="2.0" step="0.1" value="${this._config.zoom !== undefined ? this._config.zoom : 1.0}" configValue="zoom" style="flex: 1;">
          <span id="zoom-val" style="min-width: 30px; text-align: right;">${this._config.zoom !== undefined ? this._config.zoom : 1.0}</span>
        </div>
      </div>
      <style>
        .card-config ha-input {
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
    this.querySelectorAll('ha-input').forEach(el => el.addEventListener('input', ev => this._valueChanged(ev)));
    this.querySelectorAll('ha-checkbox').forEach(el => el.addEventListener('change', ev => this._valueChanged(ev)));
    this.querySelectorAll('input[type="range"]').forEach(el => {
        el.addEventListener('input', ev => {
            this.querySelector('#zoom-val').textContent = ev.target.value;
            this._valueChanged(ev);
        });
    });
    this._updateUI();
  }

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
    } else if (configValue === 'zoom') {
      newValue = parseFloat(newValue);
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

try { customElements.define('task-organizer-kanban-editor', TaskOrganizerKanbanEditor); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }
