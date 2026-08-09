const _v = new URLSearchParams(import.meta.url.split('?')[1]).get('v') || Date.now();
const { localize } = await import(`../utils/i18n.js?v=${_v}`);

export class TaskOrganizerChoiceModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._taskId = null;
    this._task = null;
    this._users = {};
    this._hass = null;
    this._settings = {};
    this._distribution = {};
    this._activeUids = [];
  }

  localize(key, replace = null) {
    return localize(this._hass, key, replace);
  }

  open(taskId, task, users, hass, settings = {}) {
    this._taskId = taskId;
    this._task = task;
    this._users = users;
    this._hass = hass;
    this._settings = settings;
    
    const currentUserId = this._hass.user?.id;
    const taskAssignees = Array.isArray(task.assignees) ? task.assignees : [];
    
    this._activeUids = Object.keys(this._users).filter(uid => 
        taskAssignees.length === 0 || taskAssignees.includes(uid) || uid === currentUserId
    );

    this._distribution = {};
    this._activeUids.forEach(uid => { 
        this._distribution[uid] = (uid === currentUserId) ? 100 : 0; 
    });

    this._render();
    this.shadowRoot.getElementById('choice-modal').classList.add('open');
  }

  _close() {
    this.shadowRoot.getElementById('choice-modal').classList.remove('open');
    this._taskId = null;
  }

  _confirm() {
    const selected = this._activeUids.filter(uid => this._distribution[uid] > 0);
    if (selected.length === 0) { 
        alert(this.localize('select_one')); 
        return; 
    }

    const roundedDist = {};
    this._activeUids.forEach(uid => {
        if (this._distribution[uid] > 0) roundedDist[uid] = this._distribution[uid];
    });
    
    this.dispatchEvent(new CustomEvent('task-complete', {
        detail: { taskId: this._taskId, userPoints: roundedDist },
        bubbles: true, composed: true
    }));
    this._close();
  }

  _handlePresetDistribution(preset, targetUid = null) {
    if (preset === 'equal') {
        const share = 100 / this._activeUids.length;
        this._activeUids.forEach(uid => this._distribution[uid] = share);
    } else if (preset === '100' && targetUid) {
        this._activeUids.forEach(uid => this._distribution[uid] = (uid === targetUid) ? 100 : 0);
    }
    this._normalizeDistribution();
    this._updateDistributionUI();
    this._updateSpiderHandlePosition();
  }

  _handleUserSliderChange(uid, val) {
    this._distribution[uid] = val;
    this._normalizeDistribution(uid);
    this._updateDistributionUI();
    this._updateSpiderHandlePosition();
  }

  _normalizeDistribution(excludeUid = null) {
    const totalComplexity = this._task.complexity || 5;
    let currentPointSum = 0;
    const ptsMap = {};
    const forceFullDistribution = this._settings.full_points_distribution === true;

    this._activeUids.forEach(uid => {
        let pts = (this._distribution[uid] / 100) * totalComplexity;
        pts = Math.round(pts * 2) / 2;
        ptsMap[uid] = pts;
        currentPointSum += pts;
    });

    let diff = totalComplexity - currentPointSum;
    if (diff !== 0 && (diff < 0 || forceFullDistribution)) {
        const eligibleUids = this._activeUids.filter(uid => uid !== excludeUid);
        const targetUids = eligibleUids.length > 0 ? eligibleUids : this._activeUids;
        const adjustUid = targetUids.sort((a, b) => ptsMap[b] - ptsMap[a])[0];
        ptsMap[adjustUid] = Math.max(0, ptsMap[adjustUid] + diff);
    }

    this._activeUids.forEach(uid => {
        this._distribution[uid] = (ptsMap[uid] / totalComplexity) * 100;
    });
  }

  _updateDistributionUI() {
    const listItems = this.shadowRoot.querySelectorAll('.dist-row');
    this._activeUids.forEach((uid, i) => {
        const pts = ((this._distribution[uid] / 100) * (this._task.complexity || 5)).toFixed(1);
        const pct = this._distribution[uid].toFixed(1);
        
        const pctPtsSpan = listItems[i].querySelector('.dist-pct-pts');
        if (pctPtsSpan) pctPtsSpan.textContent = `${pts} ${this.localize('points')}`;

        const slider = listItems[i].querySelector('.user-dist-slider');
        if (slider) slider.value = parseFloat(pct);
    });
  }

  _updateSpiderHandlePosition() {
    const svg = this.shadowRoot.getElementById('spider-svg');
    const handle = this.shadowRoot.getElementById('spider-handle');
    if (!svg || !handle || this._activeUids.length < 3) return;

    const n = this._activeUids.length;
    const svgWidth = 200, svgHeight = 200;
    const cx = svgWidth / 2, cy = svgHeight / 2, r = 80;
    const angleOffset = -Math.PI / 2;
    
    let hx = cx, hy = cy;
    this._activeUids.forEach((uid, i) => {
        const weight = this._distribution[uid] / 100;
        const vx = cx + r * Math.cos(2 * Math.PI * i / n + angleOffset);
        const vy = cy + r * Math.sin(2 * Math.PI * i / n + angleOffset);
        hx += (vx - cx) * weight;
        hy += (vy - cy) * weight;
    });

    handle.setAttribute('cx', hx);
    handle.setAttribute('cy', hy);
  }

  _render() {
    const pointStepPct = (0.5 / (this._task.complexity || 5)) * 100;
    let html = `
      <style>
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; }
        .modal.open { display: flex; }
        .modal-content { background: var(--card-background-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 400px; display: flex; flex-direction: column; max-height: 90vh; overflow-y: auto; }
      </style>
      <div id="choice-modal" class="modal">
        <div class="modal-content">
          <h2 style="margin: 0 0 8px 0;">${this.localize('who_did_it')}</h2>
          <p style="font-size: 14px; color: var(--secondary-text-color); margin-bottom: 16px;">${this.localize('fair_points')}</p>
          <div id="choice-assignees" style="display:flex; flex-direction:column; gap:4px;">
    `;

    if (this._activeUids.length > 2) {
      html += `<div id="spider-container" style="display:flex; justify-content:center; margin-bottom: 0px;"></div>`;
    }

    html += `
      <div style="display:flex; justify-content:flex-end; margin-top: -10px; margin-bottom: 8px;">
          <ha-button appearance="plain" variant="brand" class="dist-btn" data-preset="equal" style="--mdc-typography-button-font-size: 10px; height: 26px;">${this.localize('distribute_fairly')}</ha-button>
      </div>
      <div id="dist-list" style="display:flex; flex-direction:column; gap:12px;">
    `;

    this._activeUids.forEach(uid => {
      const pct = (this._distribution[uid] || 0).toFixed(1);
      const pts = ((pct / 100) * (this._task.complexity || 0)).toFixed(1);
      html += `
        <div class="dist-row" style="display:flex; align-items:flex-start; gap:12px; padding: 8px 0; border-bottom: 1px solid var(--divider-color);">
            <div style="display:flex; flex-direction:column; flex:1; min-width:0;">
                <span style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this._users[uid]}</span>
                <span class="dist-pct-pts" style="font-size: 11px; color: var(--secondary-text-color);">${pts} ${this.localize('points')}</span>
            </div>
            <input type="range" class="user-dist-slider" data-uid="${uid}" min="0" max="100" step="${pointStepPct}" value="${pct}" style="flex:1.5; height:8px; cursor:pointer; margin-top: 6px;">
            <ha-button appearance="plain" variant="brand" class="dist-btn" data-preset="100" data-uid="${uid}" style="--mdc-typography-button-font-size: 9px; height: 22px; min-width: 90px; margin-top: -5px;">${this.localize('assign_all')}</ha-button>
        </div>
      `;
    });

    html += `
          </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:24px;">
              <ha-button appearance="plain" variant="brand" id="btn-choice-cancel">${this.localize('cancel')}</ha-button>
              <ha-button raised id="btn-choice-confirm">${this.localize('confirm')}</ha-button>
          </div>
        </div>
      </div>
    `;
    
    this.shadowRoot.innerHTML = html;

    if (this._activeUids.length > 2) {
      this._renderSpiderChart();
    }

    this.shadowRoot.querySelectorAll('.user-dist-slider').forEach(slider => {
      slider.addEventListener('input', (e) => this._handleUserSliderChange(e.target.dataset.uid, parseFloat(e.target.value)));
    });

    this.shadowRoot.querySelectorAll('.dist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        const uid = e.target.dataset.uid;
        this._handlePresetDistribution(preset, uid);
      });
    });

    this.shadowRoot.getElementById('btn-choice-cancel').addEventListener('click', () => this._close());
    this.shadowRoot.getElementById('btn-choice-confirm').addEventListener('click', () => this._confirm());
  }

  _renderSpiderChart() {
    const container = this.shadowRoot.getElementById('spider-container');
    if (!container) return;
    
    const n = this._activeUids.length;
    const svgWidth = 200, svgHeight = 200;
    const cx = svgWidth / 2, cy = svgHeight / 2, r = 80;
    const angleOffset = -Math.PI / 2;
    const vertices = this._activeUids.map((_, i) => ({
        x: cx + r * Math.cos(2 * Math.PI * i / n + angleOffset),
        y: cy + r * Math.sin(2 * Math.PI * i / n + angleOffset)
    }));

    let hx = cx, hy = cy;
    const currentUserId = this._hass.user?.id;
    if (this._distribution[currentUserId] === 100) {
        const idx = this._activeUids.indexOf(currentUserId);
        hx = vertices[idx].x; hy = vertices[idx].y;
    }

    const polyPath = vertices.map(v => `${v.x},${v.y}`).join(' ');
    container.innerHTML = ` 
        <svg width="${svgWidth}" height="${svgHeight}" style="overflow:visible; cursor:crosshair;" id="spider-svg">
            <polygon points="${polyPath}" fill="var(--secondary-background-color)" stroke="var(--divider-color)" stroke-width="1" />
            ${vertices.map((v, i) => {
                const dx = 0, dy = v.y < cy ? -10 : 20;
                const name = this._users[this._activeUids[i]].split(' ')[0];
                return `
                    <line x1="${cx}" y1="${cy}" x2="${v.x}" y2="${v.y}" stroke="var(--divider-color)" stroke-dasharray="2" />
                    <text x="${v.x}" y="${v.y}" dx="${dx}" dy="${dy}" text-anchor="middle" font-size="10" fill="var(--primary-text-color)">${name}</text>
                    <circle cx="${v.x}" cy="${v.y}" r="3" fill="var(--divider-color)" />
                `;
            }).join('')}
            <circle id="spider-handle" cx="${hx}" cy="${hy}" r="8" fill="var(--primary-color)" stroke="white" stroke-width="2" style="cursor:grab; shadow: 0 2px 4px rgba(0,0,0,0.3);" />
        </svg>
    `;

    const svg = this.shadowRoot.getElementById('spider-svg');
    const handle = this.shadowRoot.getElementById('spider-handle');
    if (!svg || !handle) return;

    const update = (e) => {
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        handle.setAttribute('cx', x);
        handle.setAttribute('cy', y);

        let totalWeight = 0;
        const rawWeights = {};
        this._activeUids.forEach((uid, i) => {
            const d = Math.sqrt((x - vertices[i].x)**2 + (y - vertices[i].y)**2);
            rawWeights[uid] = Math.pow(Math.max(0, (2 * r) - d), 3);
            totalWeight += rawWeights[uid];
        });

        this._activeUids.forEach(uid => {
            this._distribution[uid] = (rawWeights[uid] / totalWeight) * 100;
        });

        this._normalizeDistribution();
        this._updateDistributionUI();
    };

    const onMove = (e) => { if (e.buttons > 0 || e.type === 'touchmove') update(e); };
    svg.addEventListener('mousedown', update);
    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('touchstart', update);
    svg.addEventListener('touchmove', onMove);
  }
}
try { customElements.define('task-organizer-choice-modal', TaskOrganizerChoiceModal); } catch (e) { if (!e.message.includes('already been used')) { throw e; } }
