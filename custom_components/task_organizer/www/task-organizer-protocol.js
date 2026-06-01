/**
 * Configuration for translations.
 */
const I18N_PROTOCOL = { 
  en: {
    title: "Household Protocol", empty: "No entries.", unknown: "Unknown",
    confirm_delete: "Really delete this entry?", edit: "Edit", points: "Points",
    user: "Assignee", cancel: "Cancel", save: "Save",
    prev: "Previous", next: "Next", page: "Page",
    edit_hover: "Edit entry", delete_hover: "Delete entry",
    entry_saved: "Entry saved!", entry_deleted: "Entry deleted!",
    height_lbl: "Height", width_lbl: "Width", title_lbl: "Title",
    items_per_page_lbl: "Items per Page", filter_by_lbl: "Filter By"
  },
  de: { 
    title: "Haushaltsprotokoll", empty: "Keine Einträge.", unknown: "Unbekannt", 
    confirm_delete: "Eintrag wirklich löschen?", edit: "Korrigieren", points: "Punkte", 
    user: "Bearbeiter", cancel: "Abbrechen", save: "Speichern",
    prev: "Zurück", next: "Weiter", page: "Seite",
    edit_hover: "Eintrag bearbeiten", delete_hover: "Eintrag löschen",
    entry_saved: "Eintrag gespeichert!", entry_deleted: "Eintrag gelöscht!",
    height_lbl: "Höhe", width_lbl: "Breite", title_lbl: "Titel",
    items_per_page_lbl: "Einträge pro Seite", filter_by_lbl: "Filtern nach"
  }
};

/**
 * Register card in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-protocol",
  name: "Task Organizer: Protocol",
  description: "A dedicated log for managing and editing completed tasks.",
  preview: true,
});

class TaskOrganizerProtocol extends HTMLElement {
  /**
   * Initializes the TaskOrganizerProtocol element.
   */
  constructor() {
    super(); 
    this.attachShadow({ mode: 'open' });
    this.history = []; 
    this.users = {}; 
    this.editingEntryId = null; 
    this._unsubEvents = null;
    this.dataLoaded = false;
    this.currentPage = 1;
    this.addEventListener('click', (ev) => this._handleClick(ev));
  }

  static _localize(hass, key) {
    const lang = (hass && hass.language) ? hass.language.substring(0, 2) : 'en';
    return (I18N_PROTOCOL[lang] || I18N_PROTOCOL['en'])[key] || key;
  }

  localize(key) { return TaskOrganizerProtocol._localize(this._hass, key); }

  static getStubConfig(hass) { 
    return { type: "custom:task-organizer-protocol", title: this._localize(hass, 'title'), items_per_page: 10, filter_by: "all" }; 
  }

  static getConfigElement() { return document.createElement("task-organizer-protocol-editor"); }

  setConfig(config) { this.config = config; if (this._hass) this.render(); }

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
    this._unsubEvents = this._hass.connection.subscribeEvents(() => this._fetchData(), "task_organizer_updated"); 
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.dataLoaded && hass) { 
      this._mapUsers(); 
      this._fetchData(); 
      this.dataLoaded = true; 
    }
    if (!this._unsubEvents) { 
      this._subscribeToUpdates(); 
    }
  }

  _mapUsers() { 
    for (const entityId in this._hass.states) { 
      if (entityId.startsWith('person.')) { 
        const state = this._hass.states[entityId]; 
        if (state.attributes.user_id) this.users[state.attributes.user_id] = state.attributes.friendly_name || entityId; 
      } 
    } 
  }

  _fetchData() { 
    this._hass.callWS({ type: 'task_organizer/get_data' }).then((data) => { 
      this.history = data.history || [];
      this.render(); 
    }); 
  }

  _handleClick(ev) {
    const path = ev.composedPath();
    const target = path.find(el => el.classList?.contains('action-btn') || ['btn-edit-save', 'btn-edit-cancel', 'btn-prev-page', 'btn-next-page'].includes(el.id));
    if (!target) return;
    
    const entryId = target.dataset.id;
    if (target.classList.contains('btn-edit')) this._openEditModal(entryId);
    if (target.classList.contains('btn-delete')) this._deleteEntry(entryId);
    if (target.id === 'btn-edit-cancel') this._closeModal();
    if (target.id === 'btn-edit-save') this._saveEdit();
    if (target.id === 'btn-prev-page') { this.currentPage = Math.max(1, this.currentPage - 1); this.render(); }
    if (target.id === 'btn-next-page') { this.currentPage++; this.render(); }
  }

  _openEditModal(entryId) { 
    const entry = this.history.find(h => h.id === entryId); 
    if (!entry) return;
    this.editingEntryId = entryId; 
    this.shadowRoot.getElementById('edit-points').value = entry.points; 
    this.shadowRoot.querySelectorAll('.edit-user-radio').forEach(radio => { radio.checked = (radio.value === entry.user_id); });
    this.shadowRoot.getElementById('edit-modal').classList.add('open'); 
  }

  _closeModal() { this.shadowRoot.getElementById('edit-modal').classList.remove('open'); this.editingEntryId = null; }

  _saveEdit() { 
    const points = parseFloat(this.shadowRoot.getElementById('edit-points').value); 
    let userId = null;
    this.shadowRoot.querySelectorAll('.edit-user-radio').forEach(radio => { if (radio.checked) userId = radio.value; });
    this._hass.callWS({ type: 'task_organizer/edit_history_item', entry_id: this.editingEntryId, points: points, user_id: userId }).then(() => { this._closeModal(); this._fetchData(); }); 
  }

  _deleteEntry(entryId) { 
    if (confirm(this.localize('confirm_delete'))) { 
      this._hass.callWS({ type: 'task_organizer/delete_history_item', entry_id: entryId }).then(() => this._fetchData());
    } 
  }

  render() {
    if (!this.config || !this._hass) return;
    const itemsPerPage = this.config.items_per_page || 10;
    let filtered = this.history;
    if (this.config.filter_by === 'mine') filtered = filtered.filter(h => h.user_id === this._hass.user.id);

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const paginated = filtered.slice((this.currentPage - 1) * itemsPerPage, this.currentPage * itemsPerPage);

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 16px; display: flex; flex-direction: column; gap: 10px; height: ${this.config.card_height || 'auto'}; overflow-y: auto; }
        .header { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
        .hist-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; border: 1px solid var(--divider-color); margin-bottom: 8px; }
        .task-name { font-weight: bold; display: block; }
        .meta { font-size: 12px; color: var(--secondary-text-color); }
        .actions { display: flex; align-items: center; gap: 4px; }
        .points-badge { font-weight: bold; color: var(--primary-color); margin-right: 8px; }
        .action-btn { background: transparent; border: none; cursor: pointer; color: var(--secondary-text-color); padding: 8px; border-radius: 50%; width: 40px; height: 40px; }
        .action-btn:hover { background: var(--secondary-background-color); color: var(--primary-text-color); }
        .btn-edit { color: var(--info-color); } .btn-delete { color: var(--error-color); }
        .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; }
        .modal.open { display: flex; }
        .modal-content { background: var(--card-background-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
      </style>
      <ha-card>
        <div class="header">${this.config.title || this.localize('title')}</div>
        ${paginated.map(entry => `
          <div class="hist-item">
            <div style="flex:1; min-width:0;">
              <span class="task-name">${entry.task_name}</span>
              <span class="meta">${new Date(entry.timestamp).toLocaleString()} • ${this.users[entry.user_id] || this.localize('unknown')}</span>
            </div>
            <div class="actions">
              <span class="points-badge">+${entry.points}</span>
              <button class="action-btn btn-edit" data-id="${entry.id}"><ha-icon icon="mdi:pencil"></ha-icon></button>
              <button class="action-btn btn-delete" data-id="${entry.id}"><ha-icon icon="mdi:delete"></ha-icon></button>
            </div>
          </div>
        `).join('')}
        <div class="pagination">
          <ha-button id="btn-prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>${this.localize('prev')}</ha-button>
          <span>${this.currentPage} / ${totalPages}</span>
          <ha-button id="btn-next-page" ${this.currentPage >= totalPages ? 'disabled' : ''}>${this.localize('next')}</ha-button>
        </div>
        <div id="edit-modal" class="modal">
          <div class="modal-content">
            <h2>${this.localize('edit')}</h2>
            <ha-input id="edit-points" type="number" label="${this.localize('points')}" step="0.1"></ha-input>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${Object.entries(this.users).map(([uid, name]) => `
                <ha-formfield label="${name}"><ha-radio class="edit-user-radio" name="u" value="${uid}"></ha-radio></ha-formfield>
              `).join('')}
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <ha-button id="btn-edit-cancel">${this.localize('cancel')}</ha-button>
              <ha-button raised id="btn-edit-save">${this.localize('save')}</ha-button>
            </div>
          </div>
        </div>
      </ha-card>`;
  }
}

class TaskOrganizerProtocolEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  localize(key) { return TaskOrganizerProtocol._localize(this._hass, key); }
  _render() {
    if (!this._config || !this._hass) return;
    if (this._rendered) { this._updateUI(); return; }
    this.innerHTML = `
      <div class="card-config">
        <ha-input label="${this.localize('title_lbl')}" value="${this._config.title || this.localize('title')}" configValue="title"></ha-input>
        <div style="display: flex; gap: 8px;">
          <ha-input label="${this.localize('height_lbl')}" placeholder="400px" value="${this._config.card_height || ''}" configValue="card_height" style="flex:1"></ha-input>
          <ha-input label="${this.localize('width_lbl')}" placeholder="100%" value="${this._config.card_width || ''}" configValue="card_width" style="flex:1"></ha-input>
        </div>
        <ha-input label="${this.localize('items_per_page_lbl')}" type="number" value="${this._config.items_per_page || 10}" configValue="items_per_page"></ha-input>
        <ha-input label="${this.localize('filter_by_lbl')}" placeholder="all, mine" value="${this._config.filter_by || 'all'}" configValue="filter_by"></ha-input>
      </div>
      <style>.card-config ha-input { display: block; margin-bottom: 8px; }</style>`;
    this._rendered = true;
    this.querySelectorAll('ha-input').forEach(el => el.addEventListener('input', ev => this._valueChanged(ev)));
    this._updateUI();
  }
  _updateUI() {
    this.querySelectorAll('[configValue]').forEach(el => {
      const val = this._config[el.getAttribute('configValue')];
      if (val !== undefined) el.value = val;
    });
  }
  _valueChanged(ev) {
    const cfg = ev.target.getAttribute('configValue');
    const val = ev.target.tagName === 'HA-INPUT' && ev.target.type === 'number' ? parseInt(ev.target.value) : ev.target.value;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: { ...this._config, [cfg]: val } }, bubbles: true, composed: true }));
  }
}

customElements.define('task-organizer-protocol-editor', TaskOrganizerProtocolEditor);
customElements.define('task-organizer-protocol', TaskOrganizerProtocol);