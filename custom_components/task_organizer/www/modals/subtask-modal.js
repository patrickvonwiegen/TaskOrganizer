const _v = new URLSearchParams(import.meta.url.split('?')[1]).get('v') || Date.now();
const { localize } = await import(`../utils/i18n.js?v=${_v}`);

export class TaskOrganizerSubtaskModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._taskId = null;
    this._task = null;
    this._hass = null;
    this._completionSubtasks = [];
  }

  localize(key, replace = null) {
    return localize(this._hass, key, replace);
  }

  open(taskId, task, hass) {
    this._taskId = taskId;
    this._task = task;
    this._hass = hass;
    this._completionSubtasks = JSON.parse(JSON.stringify(task.subtasks || []));

    this._render();
    this.shadowRoot.getElementById('subtask-completion-modal').classList.add('open');
  }

  _close() {
    this.shadowRoot.getElementById('subtask-completion-modal').classList.remove('open');
    this._taskId = null;
  }

  _renderSubtaskList() {
    const container = this.shadowRoot.getElementById('sub-completion-list');
    if (!container) return;
    container.innerHTML = this._completionSubtasks.map((st, index) => `
        <ha-formfield label="${st.title}">
            <ha-checkbox class="sub-complete-check" data-index="${index}" ${st.done ? 'checked' : ''}></ha-checkbox>
        </ha-formfield>
    `).join('');
  }

  async _save() {
    if (!this._task) return;

    const checkboxes = this.shadowRoot.querySelectorAll('.sub-complete-check');
    checkboxes.forEach(cb => {
        const index = parseInt(cb.dataset.index);
        if (this._completionSubtasks[index]) {
            this._completionSubtasks[index].done = cb.checked;
        }
    });

    const allDone = this._completionSubtasks.every(st => st.done);
    
    await this._hass.callWS({
        type: 'task_organizer/edit_task',
        task_id: this._taskId,
        subtasks: this._completionSubtasks
    });

    if (allDone) {
        const taskIdToComplete = this._taskId;
        if (confirm(this.localize('confirm_task_complete'))) {
            this._close();
            this.dispatchEvent(new CustomEvent('proceed-to-assignee', { detail: { taskId: taskIdToComplete }, bubbles: true, composed: true }));
        } else {
            this._close();
            this.dispatchEvent(new CustomEvent('subtasks-saved', { bubbles: true, composed: true }));
        }
    } else {
        this._close();
        this.dispatchEvent(new CustomEvent('subtasks-saved', { bubbles: true, composed: true }));
    }
  }

  async _completeAll() {
    if (!this._task) return;
    
    const taskIdToComplete = this._taskId;
    const updatedSubtasks = this._completionSubtasks.map(st => ({ ...st, done: true }));

    await this._hass.callWS({
        type: 'task_organizer/edit_task',
        task_id: this._taskId,
        subtasks: updatedSubtasks
    });

    this._close();
    this.dispatchEvent(new CustomEvent('proceed-to-assignee', { detail: { taskId: taskIdToComplete }, bubbles: true, composed: true }));
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; }
        .modal.open { display: flex; }
        .modal-content { background: var(--card-background-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
      </style>
      <div id="subtask-completion-modal" class="modal">
          <div class="modal-content">
              <h2 id="sub-completion-title" style="margin: 0 0 8px 0;">${this._task ? this._task.name + ' - ' : ''}${this.localize('complete_subtasks')}</h2>
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
    `;

    this._renderSubtaskList();

    this.shadowRoot.getElementById('btn-submodal-cancel').addEventListener('click', () => this._close());
    this.shadowRoot.getElementById('btn-submodal-save').addEventListener('click', () => this._save());
    this.shadowRoot.getElementById('btn-submodal-all').addEventListener('click', () => this._completeAll());
  }
}
try { customElements.define('task-organizer-subtask-modal', TaskOrganizerSubtaskModal); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }
