/**
 * Configuration for translations.
 * en: English translations.
 * de: German translations.
 */
const I18N_STATS = { 
  en: {
    title: "Household Reports", empty: "No entries.", unknown: "Unknown",
    confirm_delete: "Really delete this entry?", edit: "Edit", points: "Points",
    user: "Assignee", cancel: "Cancel", save: "Save", filter_all: "All",
    prev: "Previous", next: "Next", page: "Page",
    edit_hover: "Edit entry",
    delete_hover: "Delete entry",
    entry_saved: "Entry saved!", 
    height_lbl: "Height", width_lbl: "Width",
    title_lbl: "Title",
    items_per_page_lbl: "Items per Page",
    filter_by_lbl: "Filter By",
    filter_by_placeholder: "all, mine",
    user_filter_lbl: "User",
    show_user_select_lbl: "Show User Selection",
    points_per_day: "Points per day",
    goal_progress: "Goal progress",
    goal_reached_congrats: "Goal achieved! 🎉",
    all_users: "All Users",
    report_type: "Report Type",
    report_overview: "Completed Tasks",
    report_burndown: "Goal Setting",
    remaining_points: "Remaining Points",
    pending: "pending",
    today_target_tooltip: "Today's target: {target} pts, Current: {current} pts",
    today_points_tooltip: "Current points: {current} pts, Avg last 3 days: {average} pts",
    above_goal: "above goal"
  },
  de: { 
    title: "Haushaltsberichte", empty: "Keine Einträge.", unknown: "Unbekannt", 
    confirm_delete: "Eintrag wirklich löschen?", edit: "Korrigieren", points: "Punkte", 
    user: "Bearbeiter", cancel: "Abbrechen", save: "Speichern", filter_all: "Alle",
    prev: "Zurück", next: "Weiter", page: "Seite",
    edit_hover: "Eintrag bearbeiten",
    delete_hover: "Eintrag löschen",
    entry_saved: "Eintrag gespeichert!", 
    height_lbl: "Höhe", width_lbl: "Breite",
    title_lbl: "Titel",
    items_per_page_lbl: "Einträge pro Seite",
    filter_by_lbl: "Filtern nach",
    filter_by_placeholder: "all, mine",
    user_filter_lbl: "Benutzer",
    show_user_select_lbl: "Benutzerauswahl anzeigen",
    points_per_day: "Punkte pro Tag",
    goal_progress: "Ziel-Fortschritt",
    goal_reached_congrats: "Ziel erreicht! 🎉",
    all_users: "Alle Benutzer",
    report_type: "Berichtsart",
    report_overview: "Abgeschlossene Aufgaben",
    report_burndown: "Zielsetzung",
    remaining_points: "Verbleibende Punkte",
    pending: "ausstehend",
    today_target_tooltip: "Heutiges Soll: {target} Pkt, Aktuell: {current} Pkt",
    today_points_tooltip: "Aktuelle Punkte: {current} Pkt, Ø letzte 3 Tage: {average} Pkt",
    above_goal: "über dem Ziel"
  }
};

/**
 * Register card in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-stats",
  name: "Task Organizer: Reports",
  description: "Displays graphical reports and point progress charts.",
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
    this.settings = {};
    this.points = {};
    this.editingEntryId = null; 
    this._unsubEvents = null;
    this.dataLoaded = false;
    this._selectedUserId = 'all';
    this._reportType = 'overview';
    this.currentPeriodStart = "";
    
    this.shadowRoot.addEventListener('change', (ev) => this._handleChange(ev));
    this.shadowRoot.addEventListener('click', (ev) => this._handleTooltip(ev, 'click'));
    this.shadowRoot.addEventListener('mouseover', (ev) => this._handleTooltip(ev, 'over'));
    this.shadowRoot.addEventListener('mouseout', (ev) => this._handleTooltip(ev, 'out'));
  }

  /**
   * Statically translates a key. Helper for getStubConfig.
   * @param {object} hass - The Home Assistant object.
   * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  static _localize(hass, key, replace = null) {
    const lang = (hass && hass.language) ? hass.language.substring(0, 2) : 'en';
    const dict = I18N_STATS[lang] || I18N_STATS['en'];
    let text = dict[key] || I18N_STATS['en'][key] || key;
    if (replace) {
      for (const [k, v] of Object.entries(replace)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    return text;
  }

  /**
   * Translates a given key based on the Home Assistant language.
   * * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  localize(key, replace = null) { 
    return TaskOrganizerStats._localize(this._hass, key, replace);
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
      show_user_select: true,
      report_type: "overview"
    }; 
  }

  /**
   * Returns the editor element for GUI configuration.
   * @returns {HTMLElement}
   */
  static getConfigElement() {
    return document.createElement("task-organizer-stats-editor");
  }

  /**
   * Sets the configuration from Home Assistant.
   * * @param {object} config - The card configuration.
   */
  setConfig(config) { 
    if (!config) throw new Error("Invalid configuration");
    this.config = config; 
    // Set from config only if the user hasn't manually switched yet
    if (this._reportTypeManual === undefined) {
      this._reportType = config.report_type || 'overview';
    }
    if (this._hass) this.render();
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
    this.mapUsers(); 

    if (!this.dataLoaded && hass) { 
      this.fetchData(); 
      this.dataLoaded = true; 
    }
    // Select the current user by default if it's still set to 'all'
    if (this._selectedUserId === 'all' && hass.user && hass.user.id) {
      this._selectedUserId = hass.user.id;
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
      this.points = data.points || {};
      this.settings = data.settings || {};
      this.currentPeriodStart = data.current_period_start || "";
      this.render(); 
    }); 
  }

  _handleChange(ev) {
    ev.stopPropagation();
    if (ev.target.id === 'user-select') {
      this._selectedUserId = ev.target.value;
      this.render();
    } else if (ev.target.id === 'report-select') {
      this._reportType = ev.target.value;
      this._reportTypeManual = true;
      this.render();
    }
  }

  _handleTooltip(ev, action) {
    const tooltip = this.shadowRoot.getElementById('custom-tooltip');
    if (!tooltip) return;

    const path = ev.composedPath();
    let target = path.find(el => el.classList && el.classList.contains('data-point'));

    // If clicked, but no direct data point was hit: 
    // Find the closest point in the chart (increase hitbox / catch area)
    if (action === 'click' && !target) {
      const chartContainer = path.find(el => el.classList && el.classList.contains('chart-container'));
      if (chartContainer) {
        const dataPoints = chartContainer.querySelectorAll('.data-point');
        let minDistance = Infinity;
        
        const clientX = ev.clientX;
        const clientY = ev.clientY;

        if (clientX !== undefined && clientY !== undefined) {
          dataPoints.forEach(pt => {
            const rect = pt.getBoundingClientRect();
            const ptX = rect.left + rect.width / 2;
            const ptY = rect.top + rect.height / 2;
            
            // Pythagorean theorem for distance calculation
            const dist = Math.hypot(ptX - clientX, ptY - clientY);
            
            // Generous catch area of 50 pixels
            if (dist < minDistance && dist < 50) {
              minDistance = dist;
              target = pt;
            }
          });
        }
      }
    }

    // Hide the tooltip directly on "mouseout"
    if (action === 'out') {
      tooltip.style.display = 'none';
      return;
    }

    // Also hide the tooltip when clicking on an empty area
    if (action === 'click' && !target) {
      tooltip.style.display = 'none';
      return;
    }

    if (target && (action === 'click' || action === 'over')) {
      const text = target.getAttribute('data-tooltip');
      if (!text) return;
      
      tooltip.textContent = text;
      tooltip.style.display = 'block';

      const rect = target.getBoundingClientRect();
      let left = rect.left + rect.width / 2;
      let top = rect.top;

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;

      // Dynamically adjust tooltip at screen edges
      tooltip.style.transform = `translate(-50%, -100%)`;
      const ttRect = tooltip.getBoundingClientRect();

      if (ttRect.left < 5) {
        tooltip.style.transform = `translate(0, -100%)`;
        tooltip.style.left = `${rect.left}px`;
      } else if (ttRect.right > window.innerWidth - 5) {
        tooltip.style.transform = `translate(-100%, -100%)`;
        tooltip.style.left = `${rect.right}px`;
      }
    }
  }

  _getStyles() {
    const height = this.config.card_height || '100%';
    const width = this.config.card_width || '100%';

    return `
      <style> 
        :host { display: block; width: ${width}; margin: 0 auto; } 
        * { box-sizing: border-box; } 
        ha-card { padding: 8px 12px 2px 12px; display: flex; flex-direction: column; width: 100%; height: ${height}; overflow-x: hidden; overflow-y: auto; min-height: 100px;} 
        
        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
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
        
        .chart-container { margin: 0; padding: 2px 8px 0 8px; border-radius: 8px; position: relative; }
        .chart-title { font-size: 12px; font-weight: bold; margin-bottom: 2px; color: var(--secondary-text-color); }
        .progress-bar-bg { height: 12px; background: var(--divider-color); border-radius: 6px; position: relative; overflow: hidden; margin-top: 5px; }
        .progress-bar-fill { height: 100%; background: var(--primary-color); transition: width 0.5s ease; }
        .progress-text { font-size: 11px; margin-top: 4px; text-align: right; font-weight: bold; }

        .selector-row { display: flex; gap: 8px; margin-bottom: 2px; }
        select { 
          flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color);
          background: var(--card-background-color); color: var(--primary-text-color);
          font-family: inherit; font-size: 13px; min-width: 0; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;
        }
        .chart-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .trend-indicator {
          display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: bold;
          color: var(--secondary-text-color);
        }
        #custom-tooltip {
          position: fixed;
          display: none;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #000);
          border: 1px solid var(--divider-color, #e0e0e0);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          z-index: 10000;
          pointer-events: none;
          white-space: nowrap;
          transform: translate(-50%, -100%);
          margin-top: -8px;
        }
      </style>
    `;
  }

  _renderOverviewChart(userId) {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const periodStart = this.currentPeriodStart ? new Date(this.currentPeriodStart) : null;
    const dailyPoints = new Array(daysInMonth).fill(0);

    this.history.forEach(h => {
      const d = new Date(h.timestamp);
      // Only count entries from the current month AND after the last reset
      if (d.getMonth() === month && d.getFullYear() === year && h.user_id === userId && (!periodStart || d >= periodStart)) {
        dailyPoints[d.getDate() - 1] = (dailyPoints[d.getDate() - 1] || 0) + h.points;
      }
    });

    // Calculate trend based on last 3 days average
    const todayIndex = now.getDate() - 1;
    const todayPoints = dailyPoints[todayIndex] || 0;
    let last3DaysPoints = 0;
    let daysCounted = 0;
    for (let i = 1; i <= 3; i++) {
        if (todayIndex - i >= 0) {
            last3DaysPoints += dailyPoints[todayIndex - i];
            daysCounted++;
        }
    }
    const avgLast3Days = daysCounted > 0 ? last3DaysPoints / daysCounted : 0;
    let trendIcon = 'mdi:minus';
    let trendColor = 'var(--secondary-text-color)';
    if (todayPoints > avgLast3Days + 0.1) {
      trendIcon = 'mdi:arrow-up';
      trendColor = 'var(--success-color, #4CAF50)';
    } else if (todayPoints < avgLast3Days - 0.1) {
      trendIcon = 'mdi:arrow-down';
      trendColor = 'var(--error-color, #F44336)';
    }
    const trendTooltip = this.localize('today_points_tooltip', {current: todayPoints.toFixed(1), average: avgLast3Days.toFixed(1)});

    const maxScale = Math.max(...dailyPoints, 1);

    const svgWidth = 500;
    const svgHeight = 150;
    const chartLeft = 42;
    const xAxisY = 125;
    const chartHeight = 105;
    const barSpacing = (svgWidth - chartLeft) / daysInMonth;
    const barWidth = Math.max(1, barSpacing * 0.6);
    const yAxisLabelOffset = 5;

    const currentDayX = chartLeft + (todayIndex * barSpacing) + (barSpacing / 2);

    // Calculate Y-axis labels
    const yAxisLabels = [];
    const step = Math.max(1, Math.ceil((maxScale / 4) / 5) * 5); // Ensure step is a multiple of 5 for cleaner labels, min 1
    for (let val = 0; val <= maxScale + step; val += step) {
      const yPos = xAxisY - (val / maxScale) * chartHeight;
      if (yPos >= (xAxisY - chartHeight - 1) && yPos <= xAxisY + 1) {
        yAxisLabels.push({ 
          value: val % 1 === 0 ? val.toFixed(0) : val.toFixed(1), 
          y: yPos 
        });
      }
    }
    // Ensure the maximum value is labeled
    if (yAxisLabels.length === 0 || Math.abs(yAxisLabels[yAxisLabels.length - 1].value - maxScale) > step / 2) {
      yAxisLabels.push({ value: maxScale % 1 === 0 ? maxScale.toFixed(0) : maxScale.toFixed(1), y: xAxisY - chartHeight });
    }
    yAxisLabels.sort((a, b) => a.y - b.y); // Sort labels by y-position


    return `
      <div class="chart-container">
        <div class="chart-header-row">
          <div class="chart-title">${this.localize('points_per_day')}</div>
          <div class="trend-indicator data-point" data-tooltip="${trendTooltip}" style="cursor: pointer;">
            <ha-icon icon="${trendIcon}" style="color: ${trendColor}; --mdc-icon-size: 16px;"></ha-icon>
          </div>
        </div>
        <svg width="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" style="overflow:visible; display: block; shape-rendering: geometricPrecision; max-height: 200px;">
          <!-- Axes -->
          <line x1="${chartLeft}" y1="0" x2="${chartLeft}" y2="${xAxisY}" stroke="var(--divider-color)" stroke-width="0.5" />
          <line x1="${chartLeft}" y1="${xAxisY}" x2="${svgWidth}" y2="${xAxisY}" stroke="var(--divider-color)" stroke-width="0.5" />
          
          <!-- Current day -->
          <line x1="${currentDayX}" y1="0" x2="${currentDayX}" y2="${xAxisY}" stroke="var(--primary-color)" stroke-width="1" stroke-dasharray="4" opacity="0.6" />
          
          <!-- Y-Axis Labels -->
          ${yAxisLabels.map(label => `
            <line x1="${chartLeft}" y1="${label.y}" x2="${chartLeft - 3}" y2="${label.y}" stroke="var(--divider-color)" stroke-width="0.5" />
            <text x="${yAxisLabelOffset}" y="${label.y + 4}" text-anchor="start" font-size="11" font-weight="bold" fill="var(--secondary-text-color)">${label.value}</text>
          `).join('')}

          <!-- Bars and X-Axis Labels -->
          ${dailyPoints.map((pts, i) => {
            const x = chartLeft + (i * barSpacing) + (barSpacing / 2);
            const barHeight = (pts / maxScale) * chartHeight;
            let elements = '';

            // Only draw bars if points exist
            if (pts > 0) {
                const dayDate = new Date(year, month, i + 1);
                const formattedDate = dayDate.toLocaleDateString(this._hass.language || 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const hoverText = `${formattedDate}: ${pts.toFixed(1)} ${this.localize('points')}`;
                elements += `<rect class="data-point" data-tooltip="${hoverText}" x="${x - barWidth / 2}" y="${xAxisY - barHeight}" width="${barWidth}" height="${barHeight}" fill="var(--primary-color)" rx="2" style="cursor: pointer;" />`;
            }

            // Date on the X-axis (every 5 days + first/last day)
            if ((i + 1) === 1 || (i + 1) % 5 === 0 || (i + 1) === daysInMonth) {
              const labelX = chartLeft + (i * barSpacing) + (barSpacing / 2);
              elements += `
                <line x1="${labelX}" y1="${xAxisY}" x2="${labelX}" y2="${xAxisY + 4}" stroke="var(--divider-color)" stroke-width="0.5" />
                <text x="${labelX}" y="${xAxisY + 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--secondary-text-color)">${i + 1}</text>
              `;
            }
            return elements;
          }).join('')}
        </svg>
      </div>
    `;
  }

  _renderBurnDownChart(userId) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const goal = this.settings?.point_goals?.[userId] || 0;
    if (!goal) return `<div class="chart-container"><p style="font-size:12px; color:var(--secondary-text-color); text-align:center;">Kein Ziel gesetzt.</p></div>`;

    const periodStart = this.currentPeriodStart ? new Date(this.currentPeriodStart) : null;
    const dailyPoints = new Array(daysInMonth).fill(0);
    this.history.forEach(h => {
      const d = new Date(h.timestamp);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && h.user_id === userId && (!periodStart || d >= periodStart)) {
        dailyPoints[d.getDate() - 1] += h.points;
      }
    });

    // Pre-calculated values from backend
    const totalAchievedSoFar = this.points[userId] || 0;
    const currentPointsRemaining = goal - totalAchievedSoFar;

    // Running points for the visual line path
    let runningPoints = goal;
    const burnPoints = [goal];
    for (let i = 0; i < now.getDate(); i++) {
      runningPoints -= dailyPoints[i];
      burnPoints.push(Math.max(0, runningPoints));
    }

    const svgWidth = 500;
    const svgHeight = 150;
    const chartLeft = 42;
    const chartAreaWidth = svgWidth - chartLeft;
    const chartAreaHeight = 120;
    const scale = chartAreaHeight / goal;
    const yAxisLabelOffset = 5; 
    const xAxisY = 125;

    // Generate paths
    const idealPoints = burnPoints.map((_, i) => `${chartLeft + (i / daysInMonth) * chartAreaWidth},${xAxisY - (goal - (i * (goal / daysInMonth))) * scale}`);
    const actualPoints = burnPoints.map((p, i) => `${chartLeft + (i / daysInMonth) * chartAreaWidth},${xAxisY - p * scale}`);
    const areaPath = `${chartLeft},${xAxisY} ` + actualPoints.join(' ') + ` ${chartLeft + (burnPoints.length - 1) / daysInMonth * chartAreaWidth},${xAxisY}`;

    // Calculate Y-axis labels, only whole numbers and without overlap
    const yAxisLabels = [];
    const maxLabels = 5; // Maximum of 5 labels to avoid overlap
    let step = Math.max(1, Math.ceil(goal / maxLabels));
    if (goal > 10) {
        step = Math.ceil(step / 5) * 5; // Round to steps of 5 for cleaner axes
    }

    for (let val = 0; val <= goal; val += step) {
        const yPos = xAxisY - (val * scale);
        yAxisLabels.push({ value: val.toFixed(0), y: yPos });
    }
    // Ensure the goal value (maximum) is always displayed if it's not already part of the steps.
    if (goal % step !== 0) {
        yAxisLabels.push({ value: goal.toFixed(0), y: xAxisY - chartAreaHeight });
    }

    // Current day line
    const currentDay = Math.min(now.getDate(), daysInMonth);
    const currentDayX = chartLeft + ((currentDay - 0.5) / daysInMonth) * chartAreaWidth;

    // Calculate trend based on total points achieved vs cumulative target
    const cumulativeTargetToday = (currentDay / daysInMonth) * goal;

    let trendIcon = 'mdi:minus';
    let trendColor = 'var(--secondary-text-color)';
    if (totalAchievedSoFar > cumulativeTargetToday + 0.1) {
      trendIcon = 'mdi:arrow-up';
      trendColor = 'var(--success-color, #4CAF50)';
    } else if (totalAchievedSoFar < cumulativeTargetToday - 0.1) {
      trendIcon = 'mdi:arrow-down';
      trendColor = 'var(--error-color, #F44336)';
    }
    
    const trendTooltip = this.localize('today_target_tooltip', {target: cumulativeTargetToday.toFixed(1), current: totalAchievedSoFar.toFixed(1)});

    const pointsDiff = Math.abs(currentPointsRemaining).toFixed(1);
    const subtitleText = currentPointsRemaining >= 0 
      ? `${pointsDiff} ${this.localize('points')} ${this.localize('pending')}`
      : `${pointsDiff} ${this.localize('points')} ${this.localize('above_goal')}`;

    return `
      <div class="chart-container">
        <div class="chart-header-row">
          <div class="chart-title" style="margin-bottom: 0;">${subtitleText}</div>
          <div class="trend-indicator data-point" data-tooltip="${trendTooltip}" style="cursor: pointer;">
            <ha-icon icon="${trendIcon}" style="color: ${trendColor}; --mdc-icon-size: 16px;"></ha-icon>
          </div>
        </div>
        <svg width="100%" viewBox="0 0 ${svgWidth} ${svgHeight}" style="overflow:visible; display: block; shape-rendering: geometricPrecision; max-height: 200px;">
          <!-- Axes -->
          <line x1="${chartLeft}" y1="0" x2="${chartLeft}" y2="${xAxisY}" stroke="var(--divider-color)" stroke-width="0.5" />
          <line x1="${chartLeft}" y1="${xAxisY}" x2="${svgWidth}" y2="${xAxisY}" stroke="var(--divider-color)" stroke-width="0.5" />
          
          <!-- Ideal line -->
          <line x1="${chartLeft}" y1="0" x2="${svgWidth}" y2="${xAxisY}" stroke="var(--error-color)" stroke-width="1" stroke-dasharray="2" />
          
          <!-- Current day -->
          <line x1="${currentDayX}" y1="0" x2="${currentDayX}" y2="${xAxisY}" stroke="var(--primary-color)" stroke-width="1" stroke-dasharray="4" opacity="0.6" />

          <!-- Actual progress (area) -->
          <polyline points="${areaPath}" fill="var(--primary-color)" opacity="0.2" />
          <polyline points="${actualPoints.join(' ')}" fill="none" stroke="var(--primary-color)" stroke-width="2.5" />

          <!-- Hover points for actual progress -->
          ${burnPoints.map((p, i) => {
            const x = chartLeft + (i / daysInMonth) * chartAreaWidth;
            const y = xAxisY - p * scale;
            const dayDate = new Date(now.getFullYear(), now.getMonth(), i + 1);
            const formattedDate = dayDate.toLocaleDateString(this._hass.language || 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const hoverText = `${formattedDate}: ${p.toFixed(1)} ${this.localize('remaining_points')}`;
            return `<circle class="data-point" data-tooltip="${hoverText}" cx="${x}" cy="${y}" r="12" fill="transparent" style="cursor: pointer;"></circle>`;
          }).join('')}
          
          <!-- Y-Axis Labels -->
          ${yAxisLabels.map(label => `
            <line x1="${chartLeft}" y1="${label.y}" x2="${chartLeft - 3}" y2="${label.y}" stroke="var(--divider-color)" stroke-width="0.5" />
            <text x="${yAxisLabelOffset}" y="${label.y + 4}" text-anchor="start" font-size="11" font-weight="bold" fill="var(--secondary-text-color)">${label.value}</text>
          `).join('')}

          <!-- X-Axis Labels -->
          ${[1, 10, 20, daysInMonth].map(d => {
             const labelX = chartLeft + ((d - 1) / daysInMonth) * chartAreaWidth;
             return `
               <line x1="${labelX}" y1="${xAxisY}" x2="${labelX}" y2="${xAxisY + 4}" stroke="var(--divider-color)" stroke-width="0.5" />
               <text x="${labelX}" y="${xAxisY + 18}" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--secondary-text-color)">${d}</text>
             `;
          }).join('')}
        </svg>
      </div>
    `;
  }

  render() {
    if (!this.config || !this._hass) {
      return;
    }

    // Fallback if no user is selected yet or 'all' (which was removed)
    if (this._selectedUserId === 'all' && Object.keys(this.users).length > 0) {
      if (this._hass.user && this._hass.user.id && this.users[this._hass.user.id]) {
        this._selectedUserId = this._hass.user.id;
      } else {
        this._selectedUserId = Object.keys(this.users)[0];
      }
    }

    const showUserSelect = this.config.show_user_select !== false;
    const displayTitle = this.config.title || this.localize('title');
    let html = this._getStyles();
    
    html += `<ha-card><div class="top-bar"><div class="header">${displayTitle}</div></div>`;

    html += `<div class="selector-row">`;
    if (showUserSelect) {
      html += `
        <select id="user-select">
          ${Object.entries(this.users).map(([uid, name]) => `<option value="${uid}" ${this._selectedUserId === uid ? 'selected' : ''}>${name}</option>`).join('')}
        </select>`;
    }

    html += `
      <select id="report-select">
        <option value="overview" ${this._reportType === 'overview' ? 'selected' : ''}>${this.localize('report_overview')}</option>
        <option value="burndown" ${this._reportType === 'burndown' ? 'selected' : ''}>${this.localize('report_burndown')}</option>
      </select>
    </div>`;

    if (this._selectedUserId !== 'all') {
      if (this._reportType === 'overview') html += this._renderOverviewChart(this._selectedUserId);
      else if (this._reportType === 'burndown') html += this._renderBurnDownChart(this._selectedUserId);
    }

    html += `</ha-card>
    <div id="custom-tooltip"></div>`;
    
    this.shadowRoot.innerHTML = html;
  }
}

/**
 * Editor for TaskOrganizerStats.
 */
class TaskOrganizerStatsEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  /**
   * Translates a key using the static helper of the card.
   * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  localize(key) {
    return TaskOrganizerStats._localize(this._hass, key);
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (this._rendered) {
        this._updateUI();
        return;
    }
    this.innerHTML = `
      <div class="card-config">
        <ha-input label="${this.localize('title_lbl')}" value="${this._config.title || this.localize('title')}" configValue="title"></ha-input>
        <div style="display: flex; gap: 8px;">
          <ha-input label="${this.localize('height_lbl')}" placeholder="400px" value="${this._config.card_height || ''}" configValue="card_height" style="flex:1"></ha-input>
          <ha-input label="${this.localize('width_lbl')}" placeholder="100%" value="${this._config.card_width || ''}" configValue="card_width" style="flex:1"></ha-input>
        </div>

        <select configValue="report_type" style="width:100%; padding:8px; margin: 8px 0; border-radius:4px; background:var(--card-background-color); color:var(--primary-text-color); border:1px solid var(--divider-color);">
           <option value="overview" ${this._config.report_type === 'overview' ? 'selected' : ''}>${this.localize('report_overview')}</option>
           <option value="burndown" ${this._config.report_type === 'burndown' ? 'selected' : ''}>${this.localize('report_burndown')}</option>
        </select>
        
        <ha-formfield label="${this.localize('show_user_select_lbl')}">
          <ha-checkbox ${this._config.show_user_select !== false ? 'checked' : ''} configValue="show_user_select"></ha-checkbox>
        </ha-formfield>

      </div>
      <style>
        .card-config ha-input {
          display: block;
          margin-bottom: 8px;
        }
      </style>
    `;

    this._rendered = true;
    this.querySelectorAll('ha-input').forEach(el => el.addEventListener('input', ev => this._valueChanged(ev)));
    this._updateUI();
    this.querySelectorAll('ha-checkbox').forEach(el => el.addEventListener('change', ev => this._valueChanged(ev)));
    this.querySelectorAll('select').forEach(el => el.addEventListener('change', ev => this._valueChanged(ev)));
  }

  _updateUI() {
    if (!this._rendered) return;
    this.querySelectorAll('[configValue]').forEach(el => {
        if (el.tagName === 'HA-CHECKBOX') return; // Handled below

        const key = el.getAttribute('configValue');
        const value = this._config[key];
        if (value !== undefined) el.value = value;
    });
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    ev.stopPropagation();
    const target = ev.target;
    const configValue = target.configValue || target.getAttribute('configValue');
    let newValue = target.value !== undefined ? target.value : target.getAttribute('value');

    if (target.tagName === 'SELECT') {
      newValue = target.value;
      if (this._config[configValue] === newValue) return;
    }

    if (target.tagName === 'HA-CHECKBOX') {
      newValue = target.checked;
      if (this._config[configValue] === newValue) return;
    }

    if (target.tagName === 'HA-INPUT' && (target.type === 'number' || target.getAttribute('type') === 'number' || target.hasAttribute('type') && target.getAttribute('type') === 'number')) {
      newValue = newValue === "" ? undefined : parseInt(newValue);
    }

    if (this._config[configValue] === newValue) return;

    const event = new CustomEvent("config-changed", {
      detail: { config: { ...this._config, [configValue]: newValue } },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define('task-organizer-stats-editor', TaskOrganizerStatsEditor);
customElements.define('task-organizer-stats', TaskOrganizerStats);