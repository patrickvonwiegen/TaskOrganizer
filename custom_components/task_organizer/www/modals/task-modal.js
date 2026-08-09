const _v = new URLSearchParams(import.meta.url.split('?')[1]).get('v') || Date.now();
const { localize } = await import(`../utils/i18n.js?v=${_v}`);

export class TaskOrganizerTaskModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._editingTaskId = null;
    this._task = null;
    this._users = {};
    this._hass = null;
    this._templates = {};
    this._subtasks = [];
    this._currentTaskImages = [];
    this._currentIcon = "mdi:broom";
  }

  localize(key, replace = null) {
    return localize(this._hass, key, replace);
  }

  open(taskId, task, templates, users, hass) {
    this._editingTaskId = taskId;
    this._task = task;
    this._templates = templates || {};
    this._users = users;
    this._hass = hass;
    this._subtasks = [];
    this._currentTaskImages = [];
    
    this._render();
    
    const modal = this.shadowRoot.getElementById('task-modal');
    if (taskId && this._task) {
        const t = this._task;
        if (this.shadowRoot.getElementById('f-name')) this.shadowRoot.getElementById('f-name').value = t.name;
        if (this.shadowRoot.getElementById('f-description')) this.shadowRoot.getElementById('f-description').value = t.description || "";
        if (this.shadowRoot.getElementById('f-area')) this.shadowRoot.getElementById('f-area').value = t.area || "";
        if (this.shadowRoot.getElementById('f-interval')) {
            this.shadowRoot.getElementById('f-interval').value = (t.interval !== undefined) ? t.interval : 7;
        }
        if (this.shadowRoot.getElementById('f-complexity')) this.shadowRoot.getElementById('f-complexity').value = t.complexity;
        this._subtasks = t.subtasks ? [...t.subtasks] : [];
        this._currentTaskImages = t.images ? t.images.map(img => {
            if (typeof img === 'string') {
                return { url: img, name: img.split('/').pop() };
            }
            return img;
        }) : [];
        this._currentIcon = t.icon || "mdi:broom";
        
        this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => {
            cb.checked = t.assignees && t.assignees.includes(cb.value);
        });
        
        const isOnetime = t.interval === 0;
        this._updateTaskTypeUI(isOnetime);
        this.shadowRoot.getElementById('template-suggestions').style.display = 'none';
        
        const now = new Date();
        now.setHours(0, 0, 0, 0); 

        if (t.paused_until && new Date(t.paused_until) >= now) {
            this.shadowRoot.getElementById('f-pause-cb').checked = true;
            this.shadowRoot.getElementById('f-pause-date').value = t.paused_until;
            this.shadowRoot.getElementById('f-pause-date').style.display = '';
        } else {
            this.shadowRoot.getElementById('f-pause-cb').checked = false;
            this.shadowRoot.getElementById('f-pause-date').value = "";
            this.shadowRoot.getElementById('f-pause-date').style.display = 'none';
        }

        if (t.active_months && t.active_months.length > 0) {
            this.shadowRoot.getElementById('f-restrict-months-cb').checked = true;
            this.shadowRoot.getElementById('f-months-band').style.display = 'flex';
            this.shadowRoot.querySelectorAll('#f-months-band .month-pill').forEach(p => {
                if (t.active_months.includes(parseInt(p.dataset.month))) {
                    p.classList.add('selected');
                    p.style.background = 'var(--primary-color)';
                    p.style.color = 'var(--text-primary-color)';
                } else {
                    p.classList.remove('selected');
                    p.style.background = 'var(--secondary-background-color, #e0e0e0)';
                    p.style.color = 'var(--primary-text-color)';
                }
            });
        } else {
            this.shadowRoot.getElementById('f-restrict-months-cb').checked = false;
            this.shadowRoot.getElementById('f-months-band').style.display = 'none';
            this.shadowRoot.querySelectorAll('#f-months-band .month-pill').forEach(p => {
                p.classList.remove('selected');
                p.style.background = 'var(--secondary-background-color, #e0e0e0)';
                p.style.color = 'var(--primary-text-color)';
            });
        }
    } else {
        this.shadowRoot.getElementById('f-name').value = ""; 
        this.shadowRoot.getElementById('f-description').value = "";
        this.shadowRoot.getElementById('f-area').value = "";
        this.shadowRoot.getElementById('f-interval').value = 7;
        this.shadowRoot.getElementById('f-complexity').value = 5; 
        this._currentIcon = "mdi:broom";
        this._subtasks = [];
        
        this._updateTaskTypeUI(false); 
        this.shadowRoot.getElementById('template-suggestions').style.display = 'block';
        this.shadowRoot.getElementById('template-suggestions').innerHTML = '';
        this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => cb.checked = false);        

        this.shadowRoot.getElementById('f-pause-cb').checked = false;
        this.shadowRoot.getElementById('f-pause-date').value = "";
        this.shadowRoot.getElementById('f-pause-date').style.display = 'none';

        this.shadowRoot.getElementById('f-restrict-months-cb').checked = false;
        this.shadowRoot.getElementById('f-months-band').style.display = 'none';
        this.shadowRoot.querySelectorAll('#f-months-band .month-pill').forEach(p => {
            p.classList.remove('selected');
            p.style.background = 'var(--secondary-background-color, #e0e0e0)';
            p.style.color = 'var(--primary-text-color)';
        });

        this.shadowRoot.getElementById('f-override-overdue-cb').checked = false;
        this.shadowRoot.getElementById('f-override-overdue-days').value = "";
        this.shadowRoot.getElementById('f-override-overdue-days').style.display = 'none';
    }
    
    const setDueDateCb = this.shadowRoot.getElementById('f-set-due-date-cb');
    const customDueDateInput = this.shadowRoot.getElementById('f-custom-due-date');
    if (setDueDateCb && customDueDateInput) {
        setDueDateCb.checked = false;
        customDueDateInput.value = "";
        customDueDateInput.style.display = 'none';
    }

    const overrideOverdueCb = this.shadowRoot.getElementById('f-override-overdue-cb');
    const overrideOverdueDays = this.shadowRoot.getElementById('f-override-overdue-days');
    if (taskId && this._task) {
        const t = this._task;
        if (t.override_overdue_days !== null && t.override_overdue_days !== undefined) {
            overrideOverdueCb.checked = true;
            overrideOverdueDays.value = t.override_overdue_days;
            overrideOverdueDays.style.display = '';
        } else {
            overrideOverdueCb.checked = false;
            overrideOverdueDays.style.display = 'none';
        }
    }

    this.shadowRoot.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    this.shadowRoot.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const firstTab = this.shadowRoot.querySelector('.tab-btn[data-tab="tab-general"]');
    const firstContent = this.shadowRoot.querySelector('#tab-general');
    if (firstTab) firstTab.classList.add('active');
    if (firstContent) firstContent.classList.add('active');

    this._renderModalSubtasks();
    this._renderImageGallery();
    this._loadTaskHistory(taskId);

    const picker = this.shadowRoot.getElementById('f-icon-picker');
    if (picker) {
      picker.hass = this._hass;
      picker.value = this._currentIcon; 
    }
    
    modal.classList.add('open');
    setTimeout(() => this._updateTabScrollIndicators(), 10);
  }

  _close() {
    this.shadowRoot.getElementById('task-modal').classList.remove('open');
  }

  _updateTaskTypeUI(isOnetime) {
    const intervalField = this.shadowRoot.getElementById('f-interval');
    const btnOnetime = this.shadowRoot.getElementById('btn-type-onetime');
    const btnRecurring = this.shadowRoot.getElementById('btn-type-recurring');
    const selector = this.shadowRoot.querySelector('.task-type-selector');

    if (isOnetime) {
        intervalField.disabled = true;
        intervalField.value = 0;
        btnOnetime.classList.add('active');
        btnRecurring.classList.remove('active');
        if (selector) selector.setAttribute('data-active', 'onetime');
    } else {
        intervalField.disabled = false;
        if (intervalField.value == 0) intervalField.value = 7;
        btnOnetime.classList.remove('active');
        btnRecurring.classList.add('active');
        if (selector) selector.setAttribute('data-active', 'recurring');
    }
  }

  _handleTemplateSuggestions(e) {
    const input = e.target.value.toLowerCase();
    const suggestionsContainer = this.shadowRoot.getElementById('template-suggestions');
    suggestionsContainer.innerHTML = '';

    if (this._editingTaskId || input.length < 3) {
        return;
    }

    const matchingTemplates = Object.values(this._templates).filter(t => 
        t.name.toLowerCase().includes(input)
    );

    if (matchingTemplates.length > 0) {
        matchingTemplates.slice(0, 5).forEach(template => {
            const suggestionEl = document.createElement('button');
            suggestionEl.className = 'suggestion-item';
            suggestionEl.dataset.id = template.id;
            suggestionEl.textContent = this.localize('recreate_task_prompt', { taskName: template.name });
            suggestionEl.addEventListener('click', () => this._applyTemplate(template.id));
            suggestionsContainer.appendChild(suggestionEl);
        });
    }
  }

  _applyTemplate(templateId) {
    if (templateId && this._templates[templateId]) {
        const t = this._templates[templateId];
        this.shadowRoot.getElementById('f-name').value = t.name;
        this.shadowRoot.getElementById('f-description').value = t.description || '';
        this.shadowRoot.getElementById('f-area').value = t.area || '';
        this.shadowRoot.getElementById('f-complexity').value = t.complexity || 5;
        this.shadowRoot.getElementById('f-icon-picker').value = t.icon || 'mdi:broom';
        this.shadowRoot.getElementById('template-suggestions').innerHTML = '';
        
        this._subtasks = t.subtasks ? JSON.parse(JSON.stringify(t.subtasks)) : [];
        this._renderModalSubtasks();

        const isOnetimeSelected = this.shadowRoot.getElementById('btn-type-onetime').classList.contains('active');
        if (isOnetimeSelected) {
            this.shadowRoot.getElementById('f-interval').value = 0;
        } else {
            this.shadowRoot.getElementById('f-interval').value = t.interval > 0 ? t.interval : 7;
        }

        this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => {
            cb.checked = t.assignees && t.assignees.includes(cb.value);
        });
    }
  }

  _addSubtask() {
    const input = this.shadowRoot.getElementById('new-subtask-title');
    const title = input.value.trim();
    if (!title) return;
    
    this._subtasks.push({ title: title, done: false });
    input.value = '';
    this._renderModalSubtasks();
  }

  _removeSubtask(index) {
    this._subtasks.splice(index, 1);
    this._renderModalSubtasks();
  }

  _toggleSubtaskStatus(index) {
    this._subtasks[index].done = !this._subtasks[index].done;
    this._renderModalSubtasks();
  }

  _renderModalSubtasks() {
    const container = this.shadowRoot.getElementById('subtask-list');
    if (!container) return;
    
    if (this._subtasks.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = this._subtasks.map((st, index) => `
        <div style="display: flex; align-items: center; gap: 8px; background: var(--secondary-background-color); padding: 4px 8px; border-radius: 4px;">
            <ha-checkbox class="subtask-check" data-index="${index}" ${st.done ? 'checked' : ''}></ha-checkbox>
            <span style="flex: 1; font-size: 14px; ${st.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${st.title}</span>
            <button class="action-btn btn-del-subtask" data-index="${index}" style="width: 30px; height: 30px; background: transparent; border: none; cursor: pointer; color: var(--secondary-text-color);">
                <ha-icon icon="mdi:close" style="--mdc-icon-size: 18px;"></ha-icon>
            </button>
        </div>
    `).join('');

    container.querySelectorAll('.subtask-check').forEach(cb => {
        cb.addEventListener('change', (e) => this._toggleSubtaskStatus(parseInt(e.target.dataset.index)));
    });
    container.querySelectorAll('.btn-del-subtask').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._removeSubtask(parseInt(e.currentTarget.dataset.index));
        });
    });
  }

  _updateTabScrollIndicators() {
      const tabs = this.shadowRoot.getElementById('tabs-scroll');
      const leftBtn = this.shadowRoot.getElementById('scroll-left');
      const rightBtn = this.shadowRoot.getElementById('scroll-right');
      if (!tabs || !leftBtn || !rightBtn) return;
      
      const isScrollable = tabs.scrollWidth > tabs.clientWidth;
      const isAtStart = tabs.scrollLeft <= 0;
      const isAtEnd = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 1;
      
      if (isScrollable) {
          leftBtn.style.display = isAtStart ? 'none' : 'block';
          rightBtn.style.display = isAtEnd ? 'none' : 'block';
      } else {
          leftBtn.style.display = 'none';
          rightBtn.style.display = 'none';
      }
  }

  _loadTaskHistory(taskId) {
    const container = this.shadowRoot.getElementById('f-history-container');
    if (!container) return;
    
    if (!taskId) {
        container.innerHTML = `<div style="text-align: center; color: var(--secondary-text-color); padding: 16px;">${this.localize('no_history')}</div>`;
        return;
    }
    
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; color: var(--secondary-text-color);">
            <ha-circular-progress active size="medium"></ha-circular-progress>
            <div style="margin-top: 8px; font-size: 14px;">Lade Historie...</div>
        </div>
    `;
    
    this._hass.callWS({
        type: 'task_organizer/get_task_audit_log',
        task_id: taskId
    }).then(response => {
        this._renderAuditLog(container, response.history || []);
    }).catch(err => {
        console.error("Error loading task history:", err);
        container.innerHTML = `<div style="text-align: center; color: var(--error-color); padding: 16px;">Fehler beim Laden der Historie</div>`;
    });
  }

  _renderAuditLog(container, taskHistory) {
    if (taskHistory.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--secondary-text-color); padding: 16px;">${this.localize('no_history')}</div>`;
        return;
    }
    
    let html = '<div class="history-timeline">';
    taskHistory.forEach(entry => {
        const dateStr = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unbekannt';
        const userName = entry.user_id && this._users ? (this._users[entry.user_id] || entry.user_id) : 'Unbekannt';
        
        let title = '';
        let detailsHtml = '';
        let icon = '';
        let color = '';
        
        if (entry.action === 'created') {
            title = 'Aufgabe erstellt';
            icon = 'mdi:plus-circle';
            color = 'var(--info-color, #2196f3)';
        } else if (entry.action === 'edited') {
            title = 'Aufgabe bearbeitet';
            icon = 'mdi:text-box-edit-outline';
            color = 'var(--primary-color, #03a9f4)';
            
            const keyMap = {
                'name': 'Name', 'description': 'Beschreibung', 'area': 'Bereich',
                'interval': 'Intervall', 'assignees': 'Bearbeiter', 'complexity': 'Punkte',
                'category': 'Kategorie', 'icon': 'Icon', 'subtasks': 'Unteraufgaben',
                'images': 'Bilder', 'due_date': 'Fälligkeitsdatum', 'paused_until': 'Pausiert bis',
                'override_overdue_days': 'Überfälligkeit (Tage)'
            };
            
            const changes = entry.details?.changes;
            if (changes && Object.keys(changes).length > 0) {
                detailsHtml = '<div style="margin-top: 8px; font-size: 12px; background: rgba(0,0,0,0.1); padding: 6px; border-radius: 4px;">';
                for (const [key, diff] of Object.entries(changes)) {
                    const translatedKey = keyMap[key] || key;
                    if (key === 'subtasks') {
                        const oldSubtasks = diff.old || [];
                        const newSubtasks = diff.new || [];
                        let completedSubtasks = [];
                        let addedSubtasks = [];
                        
                        newSubtasks.forEach(st => {
                            const oldSt = oldSubtasks.find(o => o.title === st.title);
                            if (oldSt) {
                                if (st.done && !oldSt.done) {
                                    completedSubtasks.push(st.title);
                                }
                            } else {
                                addedSubtasks.push(st.title);
                            }
                        });
                        
                        if (completedSubtasks.length > 0 || addedSubtasks.length > 0) {
                            if (completedSubtasks.length > 0) {
                                completedSubtasks.forEach(stTitle => {
                                    detailsHtml += `<div style="margin-bottom: 2px; color: var(--success-color, #4caf50);">• <b>Unteraufgabe:</b> <s>${stTitle}</s> abgeschlossen <ha-icon icon="mdi:check-circle" style="--mdc-icon-size: 12px; margin-left: 2px;"></ha-icon></div>`;
                                });
                                if (Object.keys(changes).length === 1 && addedSubtasks.length === 0) {
                                    title = userName !== 'Unbekannt' ? `${userName} hat Unteraufgaben abgeschlossen` : 'Unteraufgaben abgeschlossen';
                                    icon = 'mdi:check-circle-outline';
                                    color = 'var(--success-color, #4caf50)';
                                }
                            }
                            if (addedSubtasks.length > 0) {
                                addedSubtasks.forEach(stTitle => {
                                    detailsHtml += `<div style="margin-bottom: 2px;">• <b>Unteraufgabe:</b> ${stTitle} hinzugefügt</div>`;
                                });
                            }
                        } else {
                            detailsHtml += `<div style="margin-bottom: 2px;">• <b>${translatedKey}</b> geändert</div>`;
                        }
                    } else if (key === 'images' || key === 'assignees') {
                        detailsHtml += `<div style="margin-bottom: 2px;">• <b>${translatedKey}</b> geändert</div>`;
                    } else {
                        const oldVal = diff.old !== null ? String(diff.old) : 'leer';
                        const newVal = diff.new !== null ? String(diff.new) : 'leer';
                        detailsHtml += `<div style="margin-bottom: 2px;">• <b>${translatedKey}</b>: <s>${oldVal}</s> → ${newVal}</div>`;
                    }
                }
                detailsHtml += '</div>';
            }
        } else if (entry.action === 'completed') {
            const usersWithPoints = entry.details?.users_with_points;
            if (usersWithPoints && Object.keys(usersWithPoints).length > 1) {
                title = 'Aufgabe gemeinsam abgeschlossen';
                let usersListHtml = '';
                for (const [uId, pts] of Object.entries(usersWithPoints)) {
                    const uName = this._users && this._users[uId] ? this._users[uId] : uId;
                    usersListHtml += `<div style="margin-bottom: 2px;">• <b>${uName}</b>: +${pts} Punkte</div>`;
                }
                detailsHtml = `<div style="margin-top: 8px; font-size: 12px; background: rgba(0,0,0,0.1); padding: 6px; border-radius: 4px;">${usersListHtml}</div>`;
            } else {
                title = userName !== 'Unbekannt' ? `${userName} hat die Aufgabe abgeschlossen` : 'Aufgabe abgeschlossen';
                if (entry.details?.points) {
                    detailsHtml = `<div class="timeline-points" style="color: var(--success-color, #4caf50)">+${entry.details.points} Punkte</div>`;
                }
            }
            icon = 'mdi:check-circle';
            color = 'var(--success-color, #4caf50)';
        } else {
            title = 'Aktion: ' + entry.action;
            icon = 'mdi:information';
            color = 'var(--secondary-text-color)';
        }
        
        html += `
            <div class="timeline-item" style="display: flex; gap: 16px; position: relative; padding-bottom: 16px;">
                <div class="timeline-marker" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--card-background-color); display: flex; align-items: center; justify-content: center; z-index: 1; background-color: ${color}; flex-shrink: 0;">
                    <ha-icon icon="${icon}" style="--mdc-icon-size: 16px; color: white;"></ha-icon>
                </div>
                <div class="timeline-content" style="flex: 1; min-width: 0;">
                    <div class="timeline-date" style="font-size: 11px; color: var(--secondary-text-color); margin-bottom: 4px;">${dateStr}${userName !== 'Unbekannt' ? ' • ' + userName : ''}</div>
                    <div class="timeline-title" style="font-size: 14px; font-weight: 500; color: var(--primary-text-color);">${title}</div>
                    ${detailsHtml}
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  _renderImageGallery() {
      const gallery = this.shadowRoot.getElementById('f-images-gallery');
      const dropzoneText = this.shadowRoot.getElementById('f-image-dropzone-text');
      if (!gallery) return;
      if (!this._currentTaskImages || this._currentTaskImages.length === 0) {
          gallery.innerHTML = '';
          if (dropzoneText) dropzoneText.style.display = 'flex';
          return;
      }
      if (dropzoneText) dropzoneText.style.display = 'none';
      gallery.innerHTML = this._currentTaskImages.map((imgObj, index) => {
          const url = typeof imgObj === 'string' ? imgObj : imgObj.url;
          const name = typeof imgObj === 'string' ? url.split('/').pop() : (imgObj.name || url.split('/').pop());
          const isImage = /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(url);
          
          if (isImage) {
              return `
                  <div class="image-preview" title="${name}" style="position: relative; width: 60px; height: 60px; border-radius: 4px; overflow: hidden; border: 1px solid var(--divider-color); cursor: pointer;">
                      <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
                      <button class="image-delete-btn" data-index="${index}" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer;"><ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon></button>
                  </div>
              `;
          } else {
              return `
                  <div class="image-preview file-preview" title="${name}" style="position: relative; width: 60px; height: 60px; border-radius: 4px; overflow: hidden; border: 1px solid var(--divider-color); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--secondary-background-color);">
                      <ha-icon icon="mdi:file-document-outline" style="--mdc-icon-size: 32px; color: var(--primary-color);"></ha-icon>
                      <span style="font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; text-align: center; margin-top: 4px;">${name}</span>
                      <button class="image-delete-btn" data-index="${index}" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer;"><ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon></button>
                  </div>
              `;
          }
      }).join('');
      
      gallery.querySelectorAll('.image-preview').forEach((preview, index) => {
          preview.addEventListener('click', (e) => {
              if (!e.target.closest('.image-delete-btn')) {
                  const url = typeof this._currentTaskImages[index] === 'string' ? this._currentTaskImages[index] : this._currentTaskImages[index].url;
                  window.open(url, '_blank');
              }
          });
      });
      gallery.querySelectorAll('.image-delete-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = e.currentTarget.dataset.index;
              this._currentTaskImages.splice(idx, 1);
              this._renderImageGallery();
          });
      });
  }

  async _handleImageSelection(e) {
      const targetInput = e.target;
      const files = Array.from(targetInput.files || []);
      if (!files.length) return;
      
      for (const file of files) {
          try {
              let blob = file;
              if (file.type.startsWith('image/')) {
                  blob = await this._resizeImage(file, 500);
              }
              const response = await this._uploadImage(blob, file.name);
              if (response && response.url) {
                  if (!this._currentTaskImages) this._currentTaskImages = [];
                  this._currentTaskImages.push({ url: response.url, name: response.name || file.name });
              }
          } catch (err) {
              console.error("TaskOrganizer: Image upload error", err);
              this.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Fehler beim Hochladen: " + err.message }, bubbles: true, composed: true }));
          }
      }
      
      if (targetInput && targetInput.value !== undefined) {
          targetInput.value = ''; 
      }
      this._renderImageGallery();
  }

  _resizeImage(file, maxSize) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                  let width = img.width;
                  let height = img.height;
                  if (width > maxSize || height > maxSize) {
                      if (width > height) {
                          height = Math.round((height * maxSize) / width);
                          width = maxSize;
                      } else {
                          width = Math.round((width * maxSize) / height);
                          height = maxSize;
                      }
                  }
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, width, height);
                  canvas.toBlob((blob) => {
                      resolve(blob);
                  }, 'image/jpeg', 0.85);
              };
              img.onerror = () => reject(new Error("Failed to load image for resizing"));
              img.src = e.target.result;
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
      });
  }

  async _uploadImage(blob, originalName) {
      const formData = new FormData();
      formData.append("image", blob, originalName || "upload.jpg");
      
      const response = await fetch("/api/task_organizer/upload", {
          method: "POST",
          headers: {
              authorization: `Bearer ${this._hass.auth.accessToken}`
          },
          body: formData
      });
      
      if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.url) {
          return data;
      } else {
          throw new Error(data.message || "Unknown error from server");
      }
  }

  _saveTask() {
    const name = this.shadowRoot.getElementById('f-name')?.value?.trim();
    if (!name) {
        this.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Name ist erforderlich!" }, bubbles: true, composed: true }));
        return;
    }

    const assignees = [];
    const isOnetime = this.shadowRoot.getElementById('btn-type-onetime')?.classList.contains('active') || false;
    this.shadowRoot.querySelectorAll('.assignee-cb').forEach(cb => {
        if (cb.checked) assignees.push(cb.value);
    });
    
    const setCustomDueDateCb = this.shadowRoot.getElementById('f-set-due-date-cb')?.checked || false;
    const customDueDateVal = this.shadowRoot.getElementById('f-custom-due-date')?.value;
    let customDueDate = null;
    if (setCustomDueDateCb) {
        if (customDueDateVal) customDueDate = customDueDateVal;
        else customDueDate = new Date().toISOString().split('T')[0];
    }

    const isPausedCb = this.shadowRoot.getElementById('f-pause-cb')?.checked || false;
    const pauseDateVal = this.shadowRoot.getElementById('f-pause-date')?.value;
    const pausedUntil = (isPausedCb && pauseDateVal) ? pauseDateVal : null;

    const isRestrictMonthsCb = this.shadowRoot.getElementById('f-restrict-months-cb')?.checked || false;
    let activeMonths = null;
    if (isRestrictMonthsCb) {
        activeMonths = [];
        this.shadowRoot.querySelectorAll('#f-months-band .month-pill.selected').forEach(p => {
            activeMonths.push(parseInt(p.dataset.month));
        });
        if (activeMonths.length === 0) activeMonths = null;
    }

    const isOverrideOverdueCb = this.shadowRoot.getElementById('f-override-overdue-cb')?.checked || false;
    const overrideOverdueDaysVal = this.shadowRoot.getElementById('f-override-overdue-days')?.value;
    const overrideOverdueDays = (isOverrideOverdueCb && overrideOverdueDaysVal) ? (parseInt(overrideOverdueDaysVal) || null) : null;

    const payload = {
      name: name, 
      description: this.shadowRoot.getElementById('f-description')?.value || "",
      area: this.shadowRoot.getElementById('f-area')?.value || "",
      interval: isOnetime ? 0 : parseInt(this.shadowRoot.getElementById('f-interval')?.value) || 7,
      complexity: parseInt(this.shadowRoot.getElementById('f-complexity')?.value) || 5, 
      icon: this.shadowRoot.getElementById('f-icon-picker')?.value || "mdi:broom",
      category: "Allgemein", 
      assignees: assignees,
      custom_due_date: customDueDate,
      paused_until: pausedUntil,
      active_months: activeMonths,
      override_overdue_days: overrideOverdueDays,
      subtasks: this._subtasks,
      images: this._currentTaskImages
    };
    
    this.dispatchEvent(new CustomEvent('task-saved', {
        detail: { payload, editingTaskId: this._editingTaskId },
        bubbles: true, composed: true
    }));
    this._close();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); z-index: 5000; justify-content: center; align-items: flex-start; padding-top: 10vh; box-sizing: border-box; } 
        .modal.open { display: flex; } 
        .modal-content { background: var(--card-background-color); color: var(--primary-text-color); padding: 24px; border-radius: var(--ha-dialog-border-radius, 28px); width: calc(100% - 32px); max-width: 450px; max-height: 85vh; overflow-y: auto; box-shadow: 0px 4px 16px rgba(0,0,0,0.5); margin: 0 16px; box-sizing: border-box; }
        .tabs-container { display: flex; align-items: center; border-bottom: 1px solid var(--divider-color); margin-bottom: 16px; position: relative; }
        .tabs { display: flex; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: smooth; flex: 1; }
        .tabs::-webkit-scrollbar { display: none; }
        .tab-btn { display: flex; align-items: center; justify-content: center; gap: 4px; flex: 0 0 auto; min-width: max-content; padding: 12px 6px; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; color: var(--secondary-text-color); font-size: 11px; font-weight: 500; transition: color 0.2s, border-color 0.2s; --mdc-icon-size: 16px; }
        .tab-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tab-btn:hover { color: var(--primary-text-color); }
        .tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }
        .scroll-indicator { background: var(--card-background-color); border: none; color: var(--primary-text-color); font-size: 16px; cursor: pointer; padding: 0 8px; z-index: 2; box-shadow: 0 0 4px rgba(0,0,0,0.1); height: 100%; position: absolute; }
        #scroll-left { left: 0; }
        #scroll-right { right: 0; }
        .tab-content { display: none; flex-direction: column; gap: 16px; animation: fadeIn 0.3s; }
        .tab-content.active { display: flex; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .form-row { display: flex; gap: 16px; width: 100%; box-sizing: border-box; }
        .form-col { flex: 1; min-width: 0; width: 100%; }
        .form-label { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px; display: block; }
        .assignees-container { display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; padding: 8px; background: var(--secondary-background-color); border-radius: 4px; }
        #template-suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .suggestion-item { background: var(--secondary-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color); border-radius: 16px; padding: 6px 12px; font-size: 12px; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; gap: 4px; }
        .suggestion-item:hover { background: var(--primary-color); color: var(--text-primary-color); }
        .task-type-selector { position: relative; display: grid; grid-template-columns: 1fr 1fr; background: var(--secondary-background-color); border-radius: 12px; border: 1px solid var(--divider-color); overflow: hidden; align-self: center; margin-bottom: 16px; }
        .type-slider { position: absolute; top: 0; bottom: 0; left: 0; width: 50%; background: var(--primary-color); transition: transform 0.3s ease; z-index: 0; }
        .task-type-selector[data-active="recurring"] .type-slider { transform: translateX(0); }
        .task-type-selector[data-active="onetime"] .type-slider { transform: translateX(100%); }
        .type-btn { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px 8px; background: transparent; border: none; cursor: pointer; color: var(--secondary-text-color); font-size: 11px; font-weight: 500; transition: color 0.3s; z-index: 1; white-space: nowrap; }
        .type-btn ha-icon { --mdc-icon-size: 16px; }
        .type-btn.active { color: var(--text-primary-color, white); }
        .subtask-input-row { display: flex; gap: 8px; align-items: center; }
        .subtask-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; max-height: 200px; overflow-y: auto; }
        .image-dropzone { border: 2px dashed var(--divider-color); border-radius: 8px; padding: 16px; text-align: center; color: var(--secondary-text-color); cursor: pointer; transition: background-color 0.2s, border-color 0.2s; min-height: 80px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .image-dropzone:hover, .image-dropzone.dragover { background-color: rgba(var(--rgb-primary-color), 0.05); border-color: var(--primary-color); }
        .image-gallery { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; justify-content: center; width: 100%; }
        .history-timeline { display: flex; flex-direction: column; gap: 0; padding-left: 16px; position: relative; }
        .history-timeline::before { content: ''; position: absolute; left: 32px; top: 16px; bottom: 16px; width: 2px; background: var(--divider-color); z-index: 0; }
        .month-pill { padding: 8px 12px; border-radius: 16px; background: var(--secondary-background-color, #e0e0e0); color: var(--primary-text-color); border: 1px solid var(--divider-color); cursor: pointer; user-select: none; transition: background 0.2s, color 0.2s; }
      </style>
      <div id="task-modal" class="modal">
          <div class="modal-content">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                  <h2 style="margin: 0;">${this.localize('task')}</h2>
                  <div class="task-type-selector" style="margin-bottom:0;" data-active="recurring">
                      <div class="type-slider"></div>
                      <button class="type-btn" id="btn-type-recurring">
                          <ha-icon icon="mdi:calendar-sync"></ha-icon>
                          <span>${this.localize('recurring')}</span>
                      </button>
                      <button class="type-btn" id="btn-type-onetime">
                          <ha-icon icon="mdi:calendar-check"></ha-icon>
                          <span>${this.localize('onetime')}</span>
                      </button>
                  </div>
              </div>
              
              <div class="tabs-container">
                  <button class="scroll-indicator" id="scroll-left" style="display: none;">&lt;</button>
                  <div class="tabs" id="tabs-scroll">
                      <button class="tab-btn active" data-tab="tab-general">
                          <ha-icon icon="mdi:information-outline"></ha-icon>
                          <span>${this.localize('tab_general')}</span>
                      </button>
                      <button class="tab-btn" data-tab="tab-time">
                          <ha-icon icon="mdi:clock-outline"></ha-icon>
                          <span>${this.localize('tab_time')}</span>
                      </button>
                      <button class="tab-btn" data-tab="tab-subtasks">
                          <ha-icon icon="mdi:format-list-checks"></ha-icon>
                          <span>${this.localize('tab_subtasks')}</span>
                      </button>
                      <button class="tab-btn" data-tab="tab-other">
                          <ha-icon icon="mdi:dots-grid"></ha-icon>
                          <span>${this.localize('tab_other')}</span>
                      </button>
                      <button class="tab-btn" data-tab="tab-history">
                          <ha-icon icon="mdi:history"></ha-icon>
                          <span>${this.localize('tab_history')}</span>
                      </button>
                  </div>
                  <button class="scroll-indicator" id="scroll-right" style="display: none;">&gt;</button>
              </div>
              
              <div class="tab-content active" id="tab-general">

                  <div>
                      <ha-input id="f-name" label="${this.localize('name_lbl')}" style="width: 100%;"></ha-input>
                      <div id="template-suggestions"></div>
                  </div>
                  
                  <div class="form-row">
                      <ha-input id="f-interval" type="number" label="${this.localize('interval_lbl')}" class="form-col"></ha-input>
                      <ha-input id="f-complexity" type="number" label="${this.localize('points_lbl')}" min="1" max="10" class="form-col"></ha-input>
                  </div>

                  <div class="form-row">
                      <div class="form-col">
                          <label class="form-label">${this.localize('icon_lbl')}</label>
                          <ha-icon-picker id="f-icon-picker"></ha-icon-picker>
                      </div>
                  </div>

                  <div>
                      <label class="form-label">${this.localize('assignees_lbl')}</label>
                      <div class="assignees-container">
                          ${Object.entries(this._users).map(([uid, name]) => `
                              <ha-formfield label="${name}">
                                  <ha-checkbox class="assignee-cb" id="cb-${uid}" value="${uid}"></ha-checkbox>
                              </ha-formfield>
                          `).join('')}
                      </div>
                  </div>
              </div>
              
              <div class="tab-content" id="tab-time">
                  <div style="display:flex; flex-direction:column; gap:16px;">
                      <div style="display:flex; flex-direction:column; gap:8px; align-items:stretch;">
                          <ha-formfield label="${this.localize('set_due_today')}">
                              <ha-switch id="f-set-due-date-cb"></ha-switch>
                          </ha-formfield>
                          <input type="date" id="f-custom-due-date" style="width:100%; height: 56px; box-sizing: border-box; padding: 0 16px; border: 1px solid var(--divider-color); border-radius: 4px; background: transparent; color: var(--primary-text-color); font-size: 16px; font-family: inherit; display: none;">
                      </div>
                      <div style="display:flex; flex-direction:column; gap:8px; align-items:stretch;">
                          <ha-formfield label="${this.localize('override_overdue_lbl')}">
                              <ha-switch id="f-override-overdue-cb"></ha-switch>
                          </ha-formfield>
                          <ha-input id="f-override-overdue-days" type="number" min="0" max="9999" style="width:100%; display: none;" placeholder="${this.localize('override_overdue_days_placeholder')}"></ha-input>
                      </div>
                      <div style="display:flex; flex-direction:column; gap:8px; align-items:stretch;">
                          <ha-formfield label="${this.localize('pause_until')}">
                              <ha-switch id="f-pause-cb"></ha-switch>
                          </ha-formfield>
                          <input type="date" id="f-pause-date" style="width:100%; height: 56px; box-sizing: border-box; padding: 0 16px; border: 1px solid var(--divider-color); border-radius: 4px; background: transparent; color: var(--primary-text-color); font-size: 16px; font-family: inherit; display: none;">
                      </div>
                      <div style="display:flex; flex-direction:column; gap:8px;">
                          <ha-formfield label="${this.localize('restrict_months_lbl')}">
                              <ha-switch id="f-restrict-months-cb"></ha-switch>
                          </ha-formfield>
                          <div id="f-months-band" style="display:none; flex-wrap:wrap; gap:8px; margin-top:8px;">
                              ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                                  const mName = new Date(2000, m-1, 1).toLocaleString(this._hass?.language || 'de', { month: 'short' });
                                  return `<div class="month-pill" data-month="${m}">${mName}</div>`;
                              }).join('')}
                          </div>
                      </div>
                  </div>
              </div>

              <div class="tab-content" id="tab-subtasks">
                  <div class="subtask-input-row">
                      <ha-input id="new-subtask-title" placeholder="${this.localize('subtask_placeholder')}" style="flex: 1;"></ha-input>
                      <ha-button id="btn-add-subtask">${this.localize('confirm')}</ha-button>
                  </div>
                  <div id="subtask-list" class="subtask-list"></div>
              </div>

              <div class="tab-content" id="tab-other">
                  <ha-input id="f-description" label="${this.localize('desc_lbl')}"></ha-input>
                  <div>
                      <label class="form-label">${this.localize('area_lbl')}</label>
                      <ha-area-picker id="f-area"></ha-area-picker>
                  </div>
                  <div>
                      <label class="form-label">Dateien</label>
                      <div class="image-dropzone" id="f-image-dropzone">
                          <div id="f-image-dropzone-text" style="display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none;">
                              <ha-icon icon="mdi:cloud-upload-outline"></ha-icon>
                              <span>Dateien in den Rahmen ziehen oder hier klicken</span>
                          </div>
                          <div id="f-images-gallery" class="image-gallery"></div>
                          <input type="file" id="f-images-upload" multiple accept="*/*" style="display: none;">
                      </div>
                  </div>
              </div>
              
              <div class="tab-content" id="tab-history">
                  <div id="f-history-container"></div>
              </div>
              
              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:24px;">
                  <ha-button appearance="plain" variant="brand" id="btn-modal-cancel">${this.localize('cancel')}</ha-button>
                  <ha-button raised id="btn-modal-save">${this.localize('save')}</ha-button>
              </div>
          </div>
      </div>
    `;

    const nameField = this.shadowRoot.getElementById('f-name');
    if (nameField) nameField.addEventListener('input', (e) => this._handleTemplateSuggestions(e));
    
    const pauseCb = this.shadowRoot.getElementById('f-pause-cb');
    const pauseDate = this.shadowRoot.getElementById('f-pause-date');
    if (pauseCb && pauseDate) {
        pauseCb.addEventListener('change', (e) => {
            pauseDate.style.display = e.target.checked ? '' : 'none';
            if (e.target.checked && !pauseDate.value) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                pauseDate.value = tomorrow.toISOString().split('T')[0];
            }
        });
    }

    const restrictMonthsCb = this.shadowRoot.getElementById('f-restrict-months-cb');
    const monthsBand = this.shadowRoot.getElementById('f-months-band');
    if (restrictMonthsCb && monthsBand) {
        restrictMonthsCb.addEventListener('change', (e) => {
            monthsBand.style.display = e.target.checked ? 'flex' : 'none';
            if (!e.target.checked) {
                monthsBand.querySelectorAll('.month-pill').forEach(p => {
                    p.style.background = 'var(--secondary-background-color, #e0e0e0)';
                    p.style.color = 'var(--primary-text-color)';
                    p.classList.remove('selected');
                });
            }
        });
        monthsBand.querySelectorAll('.month-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const p = e.target;
                p.classList.toggle('selected');
                if (p.classList.contains('selected')) {
                    p.style.background = 'var(--primary-color)';
                    p.style.color = 'var(--text-primary-color)';
                } else {
                    p.style.background = 'var(--secondary-background-color, #e0e0e0)';
                    p.style.color = 'var(--primary-text-color)';
                }
            });
        });
    }

    const setDueDateCb = this.shadowRoot.getElementById('f-set-due-date-cb');
    const customDueDateInput = this.shadowRoot.getElementById('f-custom-due-date');
    if (setDueDateCb && customDueDateInput) {
        setDueDateCb.addEventListener('change', (e) => {
            customDueDateInput.style.display = e.target.checked ? '' : 'none';
            if (e.target.checked && !customDueDateInput.value) {
                const today = new Date();
                customDueDateInput.value = today.toISOString().split('T')[0];
            }
        });
    }

    const overrideOverdueCb = this.shadowRoot.getElementById('f-override-overdue-cb');
    const overrideOverdueDays = this.shadowRoot.getElementById('f-override-overdue-days');
    if (overrideOverdueCb && overrideOverdueDays) {
        overrideOverdueCb.addEventListener('change', (e) => {
            overrideOverdueDays.style.display = e.target.checked ? '' : 'none';
            if (!e.target.checked) {
                overrideOverdueDays.value = "";
            }
        });
    }

    this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            this.shadowRoot.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.shadowRoot.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const currentBtn = e.currentTarget;
            const tabId = currentBtn.getAttribute('data-tab');
            currentBtn.classList.add('active');
            this.shadowRoot.getElementById(tabId).classList.add('active');
        });
    });

    const tabsScroll = this.shadowRoot.getElementById('tabs-scroll');
    if (tabsScroll) {
        tabsScroll.addEventListener('scroll', () => this._updateTabScrollIndicators());
        window.addEventListener('resize', () => this._updateTabScrollIndicators());
    }

    const dropzone = this.shadowRoot.getElementById('f-image-dropzone');
    const fileInput = this.shadowRoot.getElementById('f-images-upload');
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });
        fileInput.addEventListener('change', (e) => this._handleImageSelection(e));
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this._handleImageSelection({ target: { files: e.dataTransfer.files } });
            }
        });
    }

    this.shadowRoot.getElementById('btn-type-onetime').addEventListener('click', () => this._updateTaskTypeUI(true));
    this.shadowRoot.getElementById('btn-type-recurring').addEventListener('click', () => this._updateTaskTypeUI(false));
    this.shadowRoot.getElementById('btn-add-subtask').addEventListener('click', () => this._addSubtask());
    this.shadowRoot.getElementById('btn-modal-cancel').addEventListener('click', () => this._close());
    this.shadowRoot.getElementById('btn-modal-save').addEventListener('click', () => this._saveTask());
    
    const iconPicker = this.shadowRoot.getElementById('f-icon-picker');
    if (iconPicker) iconPicker.addEventListener('value-changed', (e) => this._currentIcon = e.detail.value);
  }
}
try { customElements.define('task-organizer-task-modal', TaskOrganizerTaskModal); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }
