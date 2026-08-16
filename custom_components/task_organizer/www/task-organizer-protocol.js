const _v = new URLSearchParams(import.meta.url.split('?')[1]).get('v') || Date.now();
const { localize } = await import(`./utils/i18n.js?v=${_v}`);
await import(`./modals/history-modal.js?v=${_v}`);

/**
 * Register card in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "task-organizer-protocol")) {
  window.customCards.push({
    type: "task-organizer-protocol",
    name: "Task Organizer: Protocol",
    description: "Displays a protocol of recently completed tasks.",
    preview: true,
  });
}

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
    this.addEventListener('history-saved', (e) => this._onHistorySaved(e));
  }

  static _localize(hass, key) {
    return localize(hass, key, null, false);
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
    
    const id = target.dataset.id;
    if (target.classList?.contains('btn-edit')) {
      const item = this.history.find(h => h.id == id);
      if (item) this.shadowRoot.getElementById('modal-history').open(item.id, item, this.users, this._hass);
    } else if (target.classList?.contains('btn-delete')) {
      this._deleteEntry(target.dataset.id);
    } else if (target.id === 'btn-prev-page') {
      this.currentPage = Math.max(1, this.currentPage - 1);
      this.render();
    } else if (target.id === 'btn-next-page') {
      this.currentPage++;
      this.render();
    }
  }

  _onHistorySaved(e) {
    const { entryId, points, userId, timestamp } = e.detail;
    this._hass.callWS({
        type: 'task_organizer/edit_history_item',
        entry_id: entryId,
        points: points,
        user_id: userId,
        timestamp: timestamp
    }).then(() => {
        this._fetchData();
        this._showToast(this.localize('entry_saved'));
    }).catch(err => {
        console.error("TaskOrganizer: Fehler beim Aktualisieren des Protokolls", err);
        this._showToast("Fehler: " + err.message);
    });
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
        ha-card { padding: 16px; display: flex; flex-direction: column; height: ${this.config.card_height || 'auto'}; overflow-y: auto; }
        .header { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
        .protocol-list { display: flex; flex-direction: column; gap: 10px; }
        .hist-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; border: 1px solid var(--divider-color); }
        .task-name { font-weight: bold; display: block; }
        .meta { font-size: 12px; color: var(--secondary-text-color); }
        .actions { display: flex; align-items: center; gap: 4px; }
        .points-badge { font-weight: bold; color: var(--primary-color); margin-right: 8px; }
        .action-btn { background: transparent; border: none; cursor: pointer; color: var(--secondary-text-color); padding: 8px; border-radius: 50%; width: 40px; height: 40px; }
        .action-btn:hover { background: var(--secondary-background-color); color: var(--primary-text-color); }
        .btn-edit { color: var(--info-color, #2196F3); } 
        .btn-delete { color: var(--error-color, #F44336); }
        .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; }
        .modal.open { display: flex; }
        .modal-content { background: var(--card-background-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
        select { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font-family: inherit; font-size: 14px; }
        .form-label { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px; display: block; }
      </style>
      <ha-card>
        <div class="header">${this.config.title || this.localize('title')}</div>
        <div class="protocol-list">
          ${paginated.map(entry => `
            <div class="hist-item">
              <div style="flex:1; min-width:0;">
                <span class="task-name">${entry.task_name}</span>
                <span class="meta">${new Date(entry.timestamp).toLocaleString()} • ${this.users[entry.user_id] || this.localize('unknown')}</span>
              </div>
              <div class="actions">
                <span class="points-badge">+${entry.points}</span>
                <button class="action-btn btn-edit" data-id="${entry.id}" title="${this.localize('edit_hover')}"><ha-icon icon="mdi:pencil"></ha-icon></button>
                <button class="action-btn btn-delete" data-id="${entry.id}" title="${this.localize('delete_hover')}"><ha-icon icon="mdi:delete"></ha-icon></button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="pagination">
          <ha-button id="btn-prev-page" ${this.currentPage === 1 ? 'disabled' : ''}>${this.localize('prev')}</ha-button>
          <span>${this.currentPage} / ${totalPages}</span>
          <ha-button id="btn-next-page" ${this.currentPage >= totalPages ? 'disabled' : ''}>${this.localize('next')}</ha-button>
        </div>
        
        <task-organizer-history-modal id="modal-history"></task-organizer-history-modal>
      </ha-card>
    `;
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

try { customElements.define('task-organizer-protocol-editor', TaskOrganizerProtocolEditor); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }
try { customElements.define('task-organizer-protocol', TaskOrganizerProtocol); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }