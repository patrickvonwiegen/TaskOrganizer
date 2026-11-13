const _v = new URLSearchParams(import.meta.url.split('?')[1]).get('v') || Date.now();
const { localize } = await import(`../utils/i18n.js?v=${_v}`);

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
        const dateInput = this.shadowRoot.getElementById('edit-date');
        if (dateInput && this._entry.timestamp) {
            const d = new Date(this._entry.timestamp);
            dateInput.value = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }
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
    const dateVal = this.shadowRoot.getElementById('edit-date').value;
    let timestamp = null;
    if (dateVal) {
        timestamp = new Date(dateVal).toISOString();
    } else if (this._entry) {
        timestamp = this._entry.timestamp;
    }

    this.dispatchEvent(new CustomEvent('history-saved', { 
        detail: { entryId: this._entryId, points: points, userId: userId, timestamp: timestamp }, 
        bubbles: true, 
        composed: true 
    }));

    this._close();
  }

  /**
   * Confirms and dispatches the history deletion event, then closes the modal.
   */
  _delete() {
    if (!this._entryId) return;
    if (confirm(this.localize('confirm_delete'))) {
      const entryId = this._entryId;
      this._close();
      this.dispatchEvent(new CustomEvent('history-deleted', {
        detail: { entryId, confirmed: true },
        bubbles: true,
        composed: true
      }));
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: flex-start; padding-top: 120px; padding-bottom: 24px; box-sizing: border-box; overflow-y: auto; }
        .modal.open { display: flex; }
        .modal-content { background: var(--card-background-color); color: var(--primary-text-color); padding: 24px; border-radius: 16px; width: fit-content; max-width: calc(100% - 32px); margin: 0 16px; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; max-height: calc(100vh - 150px); overflow-y: auto; box-shadow: 0px 4px 16px rgba(0,0,0,0.5); }
        @media (max-width: 768px), (max-height: 768px) {
          .modal { padding-top: 16px; padding-bottom: 16px; }
          .modal-content { max-height: calc(100vh - 32px); }
        }
        @media (max-width: 768px) {
          .modal-content { padding: 16px; width: calc(100% - 32px); max-width: calc(100% - 32px); margin: 0 16px; border-radius: 16px; }
        }
        select { width: 100%; padding: 10px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font-family: inherit; font-size: 14px; }
        .form-label { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px; display: block; }
        .modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 24px; }
        .modal-footer-left { display: flex; align-items: center; }
        .modal-footer-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }
        .btn-danger { color: var(--error-color, #F44336) !important; --mdc-theme-primary: var(--error-color, #F44336); }
        .btn-danger ha-icon { --mdc-icon-size: 18px; margin-right: 4px; }
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
            <div>
              <label class="form-label">${this.localize('date') || 'Datum'}</label>
              <input type="datetime-local" id="edit-date" style="width: 100%; padding: 10px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); font-family: inherit; font-size: 14px; box-sizing: border-box;">
            </div>
            <div class="modal-footer">
              <div class="modal-footer-left">
                <ha-button appearance="plain" variant="danger" id="btn-edit-delete" class="btn-danger">
                  <ha-icon icon="mdi:delete" slot="icon"></ha-icon>
                  ${this.localize('delete')}
                </ha-button>
              </div>
              <div class="modal-footer-right">
                <ha-button appearance="plain" variant="brand" id="btn-edit-cancel">${this.localize('cancel')}</ha-button>
                <ha-button raised id="btn-edit-save">${this.localize('save')}</ha-button>
              </div>
            </div>
          </div>
      </div>
    `;

    const deleteBtn = this.shadowRoot.getElementById('btn-edit-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this._delete());
    }
    this.shadowRoot.getElementById('btn-edit-cancel').addEventListener('click', () => this._close());
    this.shadowRoot.getElementById('btn-edit-save').addEventListener('click', () => this._save());
  }
}
try { customElements.define('task-organizer-history-modal', TaskOrganizerHistoryModal); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }
