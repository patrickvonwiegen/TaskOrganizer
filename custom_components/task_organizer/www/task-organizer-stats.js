/**
 * Configuration for translations.
 * en: English translations.
 * de: German translations.
 */
const I18N_STATS = {
  en: { 
    title: "Household Log", empty: "No entries.", unknown: "Unknown", 
    confirm_delete: "Really delete this entry?", edit: "Edit", points: "Points", 
    user: "Assignee", cancel: "Cancel", save: "Save", filter_all: "All",
    prev: "Previous", next: "Next", page: "Page",
    edit_hover: "Edit entry",
    delete_hover: "Delete entry"
  },
  de: { 
    title: "Haushaltsprotokoll", empty: "Keine Einträge.", unknown: "Unbekannt", 
    confirm_delete: "Eintrag wirklich löschen?", edit: "Korrigieren", points: "Punkte", 
    user: "Bearbeiter", cancel: "Abbrechen", save: "Speichern", filter_all: "Alle",
    prev: "Zurück", next: "Weiter", page: "Seite",
    edit_hover: "Eintrag bearbeiten",
    delete_hover: "Eintrag löschen"
  }
};

/**
 * Register card in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-stats",
  name: "Task Organizer: Statistics",
  description: "Displays a log of completed tasks and allows editing.",
  preview: true,
});

class TaskOrganizerStats extends HTMLElement {
  /**
   * Initializes the TaskOrganizerStats element.
   */
  constructor() {
    super(); 
    this.attachShadow({ mode: 'open' });
    
    // Global properties
    this.history = []; 
    this.users = {}; 
    this.editingEntryId = null; 
    this._unsubEvents = null;
    this.dataLoaded = false;
    
    // Pagination
    this.currentPage = 1;
    
    this.addEventListener('click', (ev) => this._handleClick(ev));
  }

  /**
   * Statically translates a key. Helper for getStubConfig.
   * @param {object} hass - The Home Assistant object.
   * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  static _localize(hass, key) {
    const lang = (hass && hass.language) ? hass.language.substring(0, 2) : 'en';
    const dict = I18N_STATS[lang] || I18N_STATS['en'];
    return dict[key] || key;
  }

  /**
   * Translates a given key based on the Home Assistant language.
   * * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  localize(key) { 
    return TaskOrganizerStats._localize(this._hass, key);
  }

  /**
   * Defines layout options for the Home Assistant grid.
   */
  static getLayoutOptions() { 
    return { grid_columns: 4, grid_rows: "auto", grid_min_columns: 1, grid_max_columns: 4 }; 
  }

  /**
   * Generates default configuration for the Card Picker.
   */
  static getStubConfig(hass) { 
    return { 
      type: "custom:task-organizer-stats", 
      title: this._localize(hass, 'title'),
      items_per_page: 10, 
      filter_by: "all" 
    }; 
  }

  /**
   * Sets the configuration from Home Assistant.
   * * @param {object} config - The card configuration.
   */
  setConfig(config) { 
    this.config = config; 
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

  /**
   * Subscribes to backend updates via websockets.
   */
  async _subscribeToUpdates() { 
    if (!this._hass) {
      return; 
    }
    this._unsubEvents = this._hass.connection.subscribeEvents(() => {
      this.fetchData();
    }, "task_organizer_updated"); 
  }

  /**
   * Sets the Home Assistant object.
   */
  set hass(hass) {
    this._hass = hass;
    if (!this.dataLoaded && hass) { 
      this.mapUsers(); 
      this.fetchData(); 
      this.dataLoaded = true; 
    }
    if (!this._unsubEvents) { 
      this._subscribeToUpdates(); 
    }
  }

  /**
   * Maps Home Assistant 'person' entities to the local users object.
   */
  mapUsers() { 
    for (const entityId in this._hass.states) { 
      if (entityId.startsWith('person.')) { 
        const state = this._hass.states[entityId]; 
        if (state.attributes.user_id) { 
          this.users[state.attributes.user_id] = state.attributes.friendly_name || entityId; 
        } 
      } 
    } 
  }

  /**
   * Fetches data from the backend.
   */
  fetchData() { 
    this._hass.callWS({ type: 'task_organizer/get_data' }).then((data) => { 
      this.history = data.history || []; 
      this.render(); 
    }); 
  }

  /**
   * Central click handler for action buttons inside the shadow DOM.
   * * @param {Event} ev - The click event.
   */
  _handleClick(ev) {
    const path = ev.composedPath();
    const target = path.find(el => 
        el.classList?.contains('action-btn') || 
        el.id === 'btn-edit-save' || 
        el.id === 'btn-edit-cancel' ||
        el.id === 'btn-prev-page' ||
        el.id === 'btn-next-page'
    );
    
    if (!target) {
      return;
    }
    
    const entryId = target.dataset.id;
    
    if (target.classList.contains('btn-edit')) this.openEditModal(entryId);
    if (target.classList.contains('btn-delete')) this.deleteEntry(entryId);
    if (target.id === 'btn-edit-cancel') this.closeModal();
    if (target.id === 'btn-edit-save') this.saveEdit();
    
    // Pagination Handler
    if (target.id === 'btn-prev-page') {
      this.currentPage = Math.max(1, this.currentPage - 1);
      this.render();
    }
    if (target.id === 'btn-next-page') {
      this.currentPage++;
      this.render();
    }
  }

  /**
   * Opens the edit modal for a specific history entry.
   * * @param {string} entryId - The UUID of the history entry.
   */
  openEditModal(entryId) { 
    const entry = this.history.find(h => h.id === entryId); 
    if (!entry) {
      return; 
    }
    
    this.editingEntryId = entryId; 
    const modal = this.shadowRoot.getElementById('edit-modal'); 
    
    this.shadowRoot.getElementById('edit-points').value = entry.points; 
    this.shadowRoot.getElementById('edit-user').value = entry.user_id; 
    
    modal.classList.add('open'); 
  }

  /**
   * Closes the edit modal and resets the editing state.
   */
  closeModal() { 
    this.shadowRoot.getElementById('edit-modal').classList.remove('open'); 
    this.editingEntryId = null; 
  }

  /**
   * Saves the modified history entry to the backend.
   */
  saveEdit() { 
    const points = parseFloat(this.shadowRoot.getElementById('edit-points').value); 
    const userId = this.shadowRoot.getElementById('edit-user').value; 
    
    this._hass.callWS({ 
      type: 'task_organizer/edit_history_item', 
      entry_id: this.editingEntryId, 
      points: points, 
      user_id: userId 
    }).then(() => { 
      this.closeModal(); 
      this.fetchData(); 
    }); 
  }

  /**
   * Deletes a history entry after user confirmation.
   * * @param {string} entryId - The UUID of the history entry.
   */
  deleteEntry(entryId) { 
    if (confirm(this.localize('confirm_delete'))) { 
      this._hass.callWS({ 
        type: 'task_organizer/delete_history_item', 
        entry_id: entryId 
      }).then(() => this.fetchData()); 
    } 
  }

  /**
   * Generates the custom CSS for the card view.
   */
  _getStyles() {
    return `
      <style> 
        :host { display: block; width: 100%; } 
        * { box-sizing: border-box; } 
        ha-card { padding: 16px; display: flex; flex-direction: column; } 
        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header { font-size: 20px; font-weight: bold; } 
        .hist-list { display: flex; flex-direction: column; gap: 10px; } 
        .hist-item { display: flex; align-items: center; justify-content: space-between; background: var(--card-background-color); padding: 12px; border-radius: 8px; border: 1px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow, 0 2px 2px rgba(0,0,0,0.1)); min-height: 75px; box-sizing: border-box; } 
        .hist-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; } 
        .task-name { font-weight: bold; font-size: 15px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } 
        .meta { font-size: 12px; color: var(--secondary-text-color); } 
        .actions { display: flex; gap: 4px; align-items: center; } 
        .points-badge { font-weight: bold; color: var(--primary-color); margin-right: 8px; font-size: 14px; } 
        .action-btn { background: none; border: none; padding: 6px; cursor: pointer; color: var(--primary-text-color); } 
        .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
        .btn-page { background: #2196F3; color: white; padding: 8px 12px; font-size: 13px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; transition: opacity 0.2s; }
        .btn-page:active { opacity: 0.8; }
        .btn-page[disabled] { background: var(--divider-color); color: var(--secondary-text-color); cursor: not-allowed; opacity: 0.6; }
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; } 
        .modal.open { display: flex; } 
        .modal-content { background: var(--card-background-color, white); padding: 25px; border-radius: 15px; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 15px; } 
        .input-group { display: flex; flex-direction: column; gap: 5px; width: 100%; } 
        .modal input, .modal select { width: 100%; padding: 12px; border: 1px solid var(--divider-color); border-radius: 8px; font-size: 16px; background: var(--primary-background-color); color: var(--primary-text-color); } 
        .modal-actions { display: flex; gap: 10px; margin-top: 10px; } 
        .btn { padding: 12px; border: none; border-radius: 8px; font-weight: bold; flex: 1; cursor: pointer; } 
        .btn-save { background: #2196F3; color: white; } 
      </style>
    `;
  }

  /**
   * Renders the HTML content.
   */
  render() {
    if (!this.config || !this._hass) {
      return;
    }

    const displayTitle = this.config.title || this.localize('title');
    let html = this._getStyles();
    
    // Filter History based on YAML configuration
    const filterBy = this.config.filter_by || 'all';
    let filteredHistory = this.history;
    
    if (filterBy === 'mine') {
      const currentUserId = this._hass.user.id;
      filteredHistory = filteredHistory.filter(h => h.user_id === currentUserId);
    }
    
    // Pagination Logic
    const itemsPerPage = this.config.items_per_page || 10;
    const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    
    const startIndex = (this.currentPage - 1) * itemsPerPage;
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

    // Render HTML Structure
    html += `
      <ha-card>
        <div class="top-bar">
          <div class="header">${displayTitle}</div>
        </div>
        <div class="hist-list">
    `;
    
    if (paginatedHistory.length === 0) {
      html += `<div style="text-align:center; color:gray; padding:20px;">${this.localize('empty')}</div>`;
    }
    
    paginatedHistory.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleString([], {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit'
      });
      const userName = this.users[entry.user_id] || this.localize('unknown');
      
      html += `
        <div class="hist-item">
          <div class="hist-info">
            <span class="task-name">${entry.task_name}</span>
            <span class="meta">${date} • ${userName}</span>
          </div>
          <div class="actions">
            <span class="points-badge">+${entry.points}</span>
            <button class="action-btn btn-edit" data-id="${entry.id}" title="${this.localize('edit_hover')}">
              <ha-icon icon="mdi:pencil-outline"></ha-icon>
            </button>
            <button class="action-btn btn-delete" data-id="${entry.id}" title="${this.localize('delete_hover')}">
              <ha-icon icon="mdi:delete-outline"></ha-icon>
            </button>
          </div>
        </div>`;
    });
    
    html += `</div>`;
    
    // Render Pagination Controls if needed
    if (filteredHistory.length > itemsPerPage) {
        html += `
            <div class="pagination">
                <button class="btn-page" id="btn-prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>${this.localize('prev')}</button>
                <span style="font-size: 13px; color: var(--secondary-text-color);">${this.localize('page')} ${this.currentPage} / ${totalPages}</span>
                <button class="btn-page" id="btn-next-page" ${this.currentPage === totalPages ? 'disabled' : ''}>${this.localize('next')}</button>
            </div>
        `;
    }

    // Render Edit Modal
    html += `
        <div id="edit-modal" class="modal">
          <div class="modal-content">
            <h2>${this.localize('edit')}</h2>
            <div class="input-group">
              <label>${this.localize('points')}</label>
              <input type="number" id="edit-points" step="0.1">
            </div>
            <div class="input-group">
              <label>${this.localize('user')}</label>
              <select id="edit-user">
                ${Object.entries(this.users).map(([uid, name]) => `<option value="${uid}">${name}</option>`).join('')}
              </select>
            </div>
            <div class="modal-actions">
              <button class="btn btn-cancel" id="btn-edit-cancel" style="background:#eee; color:#333;">${this.localize('cancel')}</button>
              <button class="btn btn-save" id="btn-edit-save">${this.localize('save')}</button>
            </div>
          </div>
        </div>
      </ha-card>
    `;
    
    this.shadowRoot.innerHTML = html;
  }
}

customElements.define('task-organizer-stats', TaskOrganizerStats);