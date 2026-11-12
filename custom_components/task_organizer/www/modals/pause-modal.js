const _v = new URLSearchParams(import.meta.url.split('?')[1]).get('v') || Date.now();
const { localize } = await import(`../utils/i18n.js?v=${_v}`);

export class TaskOrganizerPauseModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._taskId = null;
    this._hass = null;
  }

  localize(key, replace = null) {
    return localize(this._hass, key, replace);
  }

  open(taskId, hass) {
    this._taskId = taskId;
    this._hass = hass;
    this._render();
    this.shadowRoot.getElementById('pause-modal').classList.add('open');
  }

  _close() {
    this.shadowRoot.getElementById('pause-modal').classList.remove('open');
    this._taskId = null;
  }

  _save() {
    const pauseUntil = this.shadowRoot.getElementById('pause-until').value;
    if (!pauseUntil) return;

    this.dispatchEvent(new CustomEvent('task-saved', { 
        detail: { 
            payload: { paused_until: pauseUntil }, 
            editingTaskId: this._taskId 
        }, 
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
        .modal-content { background: var(--card-background-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
        h3 { margin: 0; font-size: 18px; color: var(--primary-text-color); }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
        input[type="date"] { width: 100%; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--card-background-color); color: var(--primary-text-color); font-family: inherit; box-sizing: border-box; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
      </style>
      <div id="pause-modal" class="modal">
        <div class="modal-content">
          <h3>${this.localize('set_pause_time') || 'Pausenzeit festlegen'}</h3>
          
          <div class="input-group">
            <label for="pause-until">${this.localize('pause_until') || 'Pause bis'}</label>
            <input type="date" id="pause-until">
          </div>
          
          <div class="modal-actions">
            <ha-button @click="\${this._close}">${this.localize('cancel')}</ha-button>
            <ha-button @click="\${this._save}">${this.localize('save')}</ha-button>
          </div>
        </div>
      </div>
    `;

    // Initialize date to tomorrow by default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    this.shadowRoot.getElementById('pause-until').value = `${yyyy}-${mm}-${dd}`;

    this.shadowRoot.querySelector('.modal-actions ha-button:first-child').addEventListener('click', () => this._close());
    this.shadowRoot.querySelector('.modal-actions ha-button:last-child').addEventListener('click', () => this._save());
  }
}

customElements.define('task-organizer-pause-modal', TaskOrganizerPauseModal);
