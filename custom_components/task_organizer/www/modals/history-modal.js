import { localize } from '../utils/i18n.js';

export class TaskOrganizerHistoryModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._entryId = null;
    this._entry = null;
    this._users = {};
    this._hass = null;
  }

  localize(key, replace = null) {
    return localize(this._hass, key, replace, true);
  }

  open(entryId, entry, users, hass) {
    this._entryId = entryId;
    this._entry = entry;
    this._users = users;
    this._hass = hass;

    this._render();
    
    if (this._entry) {
        this.shadowRoot.getElementById('edit-points').value = this._entry.points; 
        const userSelect = this.shadowRoot.getElementById('edit-user-select');
        if (userSelect) userSelect.value = this._entry.user_id;
    }

    this.shadowRoot.getElementById('edit-modal').classList.add('open');
  }

  _close() {
    this.shadowRoot.getElementById('edit-modal').classList.remove('open');
    this._entryId = null;
  }

  _save() {
    const points = parseFloat(this.shadowRoot.getElementById('edit-points').value); 
    const userSelect = this.shadowRoot.getElementById('edit-user-select');
    const userId = userSelect ? userSelect.value : null;

    this.dispatchEvent(new CustomEvent('history-saved', { 
        detail: { entryId: this._entryId, points: points, userId: userId }, 
        bubbles: true, 
        composed: true 
    }));

    this._close();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; }
        .modal.open { display: flex; }
        .modal-content { background: var(--card-background-color); color: var(--primary-text-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
        select { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font-family: inherit; font-size: 14px; }
        .form-label { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px; display: block; }
      </style>
      <div id="edit-modal" class="modal">
          <div class="modal-content">
            <h2 style="margin: 0;">${this.localize('edit')}</h2>
            <ha-input id="edit-points" type="number" label="${this.localize('points')}" step="0.1"></ha-input>
            <div>
              <label class="form-label">${this.localize('user')}</label>
              <select id="edit-user-select">
                ${Object.entries(this._users).map(([uid, name]) => `
                  <option value="${uid}">${name}</option>
                `).join('')}
              </select>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <ha-button appearance="plain" variant="brand" id="btn-edit-cancel">${this.localize('cancel')}</ha-button>
              <ha-button raised id="btn-edit-save">${this.localize('save')}</ha-button>
            </div>
          </div>
      </div>
    `;

    this.shadowRoot.getElementById('btn-edit-cancel').addEventListener('click', () => this._close());
    this.shadowRoot.getElementById('btn-edit-save').addEventListener('click', () => this._save());
  }
}
try { customElements.define('task-organizer-history-modal', TaskOrganizerHistoryModal); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }
