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
    
    // Set active radio button based on the entry's user_id
    this.shadowRoot.querySelectorAll('.edit-user-radio').forEach(radio => {
        radio.checked = (radio.value === entry.user_id);
    });
    
    modal.classList.add('open'); 
  }

  closeModal() { 
    this.shadowRoot.getElementById('edit-modal').classList.remove('open'); 
    this.editingEntryId = null; 
  }

  saveEdit() { 
    const points = parseFloat(this.shadowRoot.getElementById('edit-points').value); 
    
    // Read the selected user_id from the active radio button
    let userId = null;
    this.shadowRoot.querySelectorAll('.edit-user-radio').forEach(radio => {
        if (radio.checked) {
            userId = radio.value;
        }
    });

    if (!userId) {
        return; // Safety guard if somehow nothing is selected
    }
    
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

  _getStyles() {
    return `
      <style> 
        :host { display: block; width: 100%; height: 100%; } 
        * { box-sizing: border-box; } 
        ha-card { padding: 16px; display: flex; flex-direction: column; width: 100%; height: 100%; overflow-x: hidden; overflow-y: auto;} 
        
        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header { font-size: 20px; font-weight: bold; color: var(--primary-text-color); } 
        
        .hist-list { display: flex; flex-direction: column; gap: 10px; width: 100%; } 
        .hist-item { display: flex; align-items: center; justify-content: space-between; background: var(--card-background-color); padding: 12px; border-radius: 8px; border: 1px solid var(--divider-color); transition: transform 0.2s; min-height: 75px; box-sizing: border-box; } 
        .hist-item:hover { background-color: var(--secondary-background-color); transform: translateX(2px); box-shadow: -2px 4px 8px rgba(0,0,0,0.1); } 
        
        .hist-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; color: var(--primary-text-color); } 
        .task-name { font-weight: bold; font-size: 15px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } 
        .meta { font-size: 12px; color: var(--secondary-text-color); } 
        
        .actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; } 
        .points-badge { font-weight: bold; color: var(--primary-color); font-size: 14px; margin-right: 8px; } 
        
        .action-btn { background: transparent; border: none; padding: 8px; border-radius: 50%; cursor: pointer; color: var(--secondary-text-color); transition: background-color 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; }
        .action-btn:hover { background-color: var(--divider-color); color: var(--primary-text-color); }
        .btn-edit { color: var(--info-color, #2196F3); } 
        .btn-delete { color: var(--error-color, #F44336); } 
        
        .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
        
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; } 
        .modal.open { display: flex; } 
        .modal-content { background: var(--card-background-color); color: var(--primary-text-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 450px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0px 4px 16px rgba(0,0,0,0.5); } 
        
        .form-label { font-size: 14px; font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; display: block; }
      </style>
    `;
  }

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
    
    const itemsPerPage = this.config.items_per_page || 10;
    const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
    if (this.currentPage > totalPages) this.currentPage = Math.max(1, totalPages);
    
    const startIndex = (this.currentPage - 1) * itemsPerPage;
    const paginatedHistory = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

    html += `
      <ha-card>
        <div class="top-bar">
          <div class="header">${displayTitle}</div>
        </div>
        <div class="hist-list">
    `;
    
    if (paginatedHistory.length === 0) {
      html += `<div style="text-align:center; color: var(--secondary-text-color); padding:20px;">${this.localize('empty')}</div>`;
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
              <ha-icon icon="mdi:pencil"></ha-icon>
            </button>
            <button class="action-btn btn-delete" data-id="${entry.id}" title="${this.localize('delete_hover')}">
              <ha-icon icon="mdi:delete"></ha-icon>
            </button>
          </div>
        </div>`;
    });
    
    html += `</div>`;
    
    // Render Pagination Controls
    if (filteredHistory.length > itemsPerPage) {
        html += `
            <div class="pagination">
                <ha-button id="btn-prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>${this.localize('prev')}</ha-button>
                <span style="font-size: 14px; color: var(--secondary-text-color); font-weight: 500;">${this.localize('page')} ${this.currentPage} / ${totalPages}</span>
                <ha-button id="btn-next-page" ${this.currentPage === totalPages ? 'disabled' : ''}>${this.localize('next')}</ha-button>
            </div>
        `;
    }

    // Render Edit Modal
    html += `
        <div id="edit-modal" class="modal">
          <div class="modal-content">
            <h2 style="margin: 0 0 8px 0;">${this.localize('edit')}</h2>
            
            <ha-textfield id="edit-points" type="number" label="${this.localize('points')}" step="0.1"></ha-textfield>
            
            <div>
                <label class="form-label">${this.localize('user')}</label>
                <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px;">
                    ${Object.entries(this.users).map(([uid, name]) => `
                        <ha-formfield label="${name}">
                            <ha-radio class="edit-user-radio" name="edit_user_radio" value="${uid}"></ha-radio>
                        </ha-formfield>
                    `).join('')}
                </div>
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:24px;">
              <ha-button id="btn-edit-cancel">${this.localize('cancel')}</ha-button>
              <ha-button raised id="btn-edit-save">${this.localize('save')}</ha-button>
            </div>
          </div>
        </div>
      </ha-card>
    `;
    
    this.shadowRoot.innerHTML = html;
  }
}

customElements.define('task-organizer-stats', TaskOrganizerStats);