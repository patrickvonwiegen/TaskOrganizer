/**
 * Configuration for translations.
 * en: English translations.
 * de: German translations.
 */
const I18N_BOARD = {
  en: { title: "Roommate of the Month", no_points: "No points this month.", unknown: "Unknown", pts: "Pts", today: "Today", month: "Month", year: "Year", winner: "Winner", history: "History", podium_hover: "{place}. Place: {name} ({points} Pts)", history_hover: "Winner in {month} {year}: {name} with {points} points", height_lbl: "Height", width_lbl: "Width", title_lbl: "Title", show_history_lbl: "Show History" },
  de: { title: "Mitbewohner des Monats", no_points: "Keine Punkte diesen Monat.", unknown: "Unbekannt", pts: "Pkt", today: "Heute", month: "Monat", year: "Jahr", winner: "Sieger", history: "Historie", podium_hover: "{place}. Platz: {name} ({points} Pkt)", history_hover: "Sieger im {month} {year}: {name} mit {points} Punkten", height_lbl: "Höhe", width_lbl: "Breite", title_lbl: "Titel", show_history_lbl: "Verlauf anzeigen" }
};

/**
 * Register card in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-leaderboard",
  name: "Task Organizer: Leaderboard",
  description: "Displays the roommate of the month and the history of previous winners.",
  preview: true,
});

class TaskOrganizerLeaderboard extends HTMLElement {
  /**
   * Initializes the TaskOrganizerLeaderboard element.
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Global properties
    this.points = {}; 
    this.users = {}; 
    this.currentMonth = ""; 
    this.currentPeriodStart = ""; 
    this.monthlyHistory = {}; 
    this._unsubEvents = null;
    this.dataLoaded = false;
  }

  /**
   * Statically translates a key. Helper for getStubConfig.
   * @param {object} hass - The Home Assistant object.
   * @param {string} key - The translation key.
   * @param {object} replace - Object with parameters to replace in string.
   * @returns {string} - The translated text.
   */
  static _localize(hass, key, replace = null) {
    const lang = (hass && hass.language) ? hass.language.substring(0, 2) : 'en';
    const dict = I18N_BOARD[lang] || I18N_BOARD['en'];
    let text = dict[key] || I18N_BOARD['en'][key] || key;
    
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
   * @param {object} replace - Object with parameters to replace in string.
   * @returns {string} - The translated text.
   */
  localize(key, replace = null) { 
    return TaskOrganizerLeaderboard._localize(this._hass, key, replace);
  }

  /**
   * Defines layout options for the Home Assistant grid.
   */
  static getLayoutOptions() { 
    return { 
      grid_columns: 4, 
      grid_rows: "auto", 
      grid_min_columns: 1, 
      grid_max_columns: 4 
    }; 
  }

  /**
   * Generates default configuration for the Card Picker.
   */
  static getStubConfig(hass) { 
    return { 
      type: "custom:task-organizer-leaderboard", 
      title: this._localize(hass, 'title'),
      show_history: true 
    }; 
  }

  /**
   * Returns the editor element for GUI configuration.
   * @returns {HTMLElement}
   */
  static getConfigElement() {
    return document.createElement("task-organizer-leaderboard-editor");
  }

  /**
   * Sets the configuration from Home Assistant.
   * * @param {object} config - The card configuration.
   */
  setConfig(config) { 
    if (!config) throw new Error("Invalid configuration");
    this.config = config; 
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
          this.users[state.attributes.user_id] = { 
            name: state.attributes.friendly_name || entityId, 
            picture: state.attributes.entity_picture || '' 
          }; 
        } 
      } 
    } 
  }
  
  /**
   * Fetches data from the backend.
   */
  fetchData() { 
    this._hass.callWS({ type: 'task_organizer/get_data' }).then((data) => { 
        this.points = data.points || {}; 
        this.currentMonth = data.current_month || ""; 
        this.currentPeriodStart = data.current_period_start || "";
        this.monthlyHistory = data.monthly_history || {};
        this.render(); 
    }); 
  }

  /**
   * Generates the custom CSS for the card view.
   */
  _getStyles() {
    const width = this.config.card_width || '100%';
    const height = this.config.card_height || 'auto';

    return `
      <style> 
        :host { display: block; width: ${width}; margin: 0 auto; } 
        ha-card { padding: 16px; text-align: center; width: 100%; height: ${height}; box-sizing: border-box; overflow-y: auto; display: flex; flex-direction: column; } 
        .header { font-size: 20px; font-weight: bold; margin-bottom: 24px; } 
        .period-text { font-size: 12px; font-weight: normal; color: var(--secondary-text-color); margin-top: 4px; } 
        .podium-container { display: flex; justify-content: center; align-items: flex-end; gap: 8px; min-height: 200px; margin-top: 10px; } 
        .podium-place { display: flex; flex-direction: column; align-items: center; width: 30%; position: relative; justify-content: flex-end; } 
        .trophy-container { position: relative; display: flex; justify-content: center; margin-bottom: 3px; z-index: 10; }
        .trophy-icon { filter: drop-shadow(0 3px 3px rgba(0,0,0,0.3)); }
        .place-number { position: absolute; top: 12px; font-size: 18px; font-weight: bold; z-index: 5; text-align: center; width: 100%; text-shadow: 1px 1px 2px rgba(255,255,255,0.3); }
        .step { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 6px; gap: 4px; font-size: 14px; font-weight: bold; color: rgba(0,0,0,0.8); border-top-left-radius: 8px; border-top-right-radius: 8px; transition: height 0.5s ease;}
        .step-label { background: rgba(255,255,255,0.5); padding: 2px 6px; border-radius: 12px; font-size: 12px; white-space: nowrap; max-width: 90%; overflow: hidden; text-overflow: ellipsis; }
        /* Colors for the podium steps: Gold, Silver, Bronze */
        .place-1 .step { background: linear-gradient(to top, #FFD700, #FDB931); } 
        .place-2 .step { background: linear-gradient(to top, #C0C0C0, #E0E0E0); } 
        .place-3 .step { background: linear-gradient(to top, #CD7F32, #D2B48C); }
        .history-section { margin-top: 30px; border-top: 1px solid var(--divider-color); padding-top: 15px; text-align: left; }
        .history-title { font-size: 16px; font-weight: bold; margin-bottom: 12px; }
        .history-table { width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; }
        .history-table th { border-bottom: 2px solid var(--divider-color); padding: 8px 4px; color: var(--secondary-text-color); }
        .history-table td { border-bottom: 1px solid var(--divider-color); padding: 8px 4px; }
      </style>
    `;
  }

  /**
   * Renders the HTML content.
   */
  render() {
    if (!this.config || !this._hass) {
      return;
    }

    let sortedUsers = Object.keys(this.points).map(userId => { 
      return { 
        id: userId, 
        points: this.points[userId], 
        name: this.users[userId]?.name || this.localize('unknown'), 
        picture: this.users[userId]?.picture || '' 
      }; 
    }).sort((a, b) => b.points - a.points);
    
    let periodStr = "";
    if (this.currentPeriodStart) {
        const startDate = new Date(this.currentPeriodStart);
        periodStr = `${startDate.toLocaleDateString()} - ${this.localize('today')}`;
    } else if (this.currentMonth) {
        const [year, month] = this.currentMonth.split('-');
        const startDate = new Date(year, month - 1, 1);
        periodStr = `${startDate.toLocaleDateString()} - ${this.localize('today')}`;
    }

    const displayTitle = this.config.title || this.localize('title');
    const showHistory = this.config.show_history !== false;

    // Start generating HTML
    let html = this._getStyles();
    html += `<ha-card><div class="header">${displayTitle}${periodStr ? `<div class="period-text">${periodStr}</div>` : ''}</div>`;

    if (sortedUsers.length === 0) { 
      html += `<div style="color: var(--secondary-text-color);">${this.localize('no_points')}</div>`; 
    } else {
      const first = sortedUsers[0]; 
      const second = sortedUsers.length > 1 ? sortedUsers[1] : null; 
      const third = sortedUsers.length > 2 ? sortedUsers[2] : null;

      let h1 = 140;
      let h2 = 90;
      let h3 = 42;
      const minGap = 15;

      if (first && third) {
        const p1 = first.points;
        const p2 = second.points;
        const p3 = third.points;
        h1 = 140;
        h3 = 42;
        const range = p1 - p3;
        if (range > 0) {
          let ratio = (p2 - p3) / range;
          h2 = 42 + ratio * (140 - 42);
        } else {
          h2 = (140 + 42) / 2;
        }
        if (h2 > h1 - minGap) h2 = h1 - minGap;
        if (h2 < h3 + minGap) h2 = h3 + minGap;
      } else if (first && second) {
        const p1 = first.points;
        const p2 = second.points;
        h1 = 140;
        if (p1 > 0) {
           let ratio = p2 / p1;
           h2 = 42 + ratio * (140 - 42);
        } else {
           h2 = 90;
        }
        if (h2 > h1 - minGap) h2 = h1 - minGap;
      }
      
      // Render the podium
      html += `<div class="podium-container">`;
      if (second) {
        html += this.generatePodiumHTML(second, 2, h2);
      }
      if (first) {
        html += this.generatePodiumHTML(first, 1, h1);
      }
      if (third) {
        html += this.generatePodiumHTML(third, 3, h3);
      }
      html += `</div>`;
    }

    if (showHistory && Object.keys(this.monthlyHistory).length > 0) {
        // Render the history table
        html += `<div class="history-section"><div class="history-title">${this.localize('history')}</div>`;
        html += `<table class="history-table"><thead><tr><th>${this.localize('month')}</th><th>${this.localize('year')}</th><th>${this.localize('winner')}</th><th>${this.localize('pts')}</th></tr></thead><tbody>`;
        
        const sortedMonths = Object.keys(this.monthlyHistory).sort((a, b) => b.localeCompare(a));
        const lang = (this._hass && this._hass.language) || 'de';

        sortedMonths.forEach(monthKey => {
            const pointsObj = this.monthlyHistory[monthKey];
            if (!pointsObj || Object.keys(pointsObj).length === 0) {
              return;
            }

            let winnerId = null;
            let maxPts = -1;
            for (const [uid, pts] of Object.entries(pointsObj)) {
                if (pts > maxPts) { 
                  maxPts = pts; 
                  winnerId = uid; 
                }
            }

            if (maxPts > 0 && winnerId) {
                const [y, m] = monthKey.split('-');
                const dateObj = new Date(y, m - 1, 1);
                const monthName = dateObj.toLocaleString(lang, { month: 'long' });
                const winnerName = this.users[winnerId]?.name || winnerId;
                const hoverText = this.localize('history_hover', { month: monthName, year: y, name: winnerName, points: maxPts });

                html += `<tr title="${hoverText}"><td>${monthName}</td><td>${y}</td><td>${winnerName}</td><td>${maxPts}</td></tr>`;
            }
        });
        html += `</tbody></table></div>`;
    }

    html += `</ha-card>`;
    this.shadowRoot.innerHTML = html;
  }

  /**
   * Generates HTML for a single podium place.
   * * @param {object} user - The user object.
   * @param {number} place - The position (1, 2, or 3).
   * @param {number} height - The height of the podium step.
   * @returns {string} - The HTML string for the podium step.
   */
  generatePodiumHTML(user, place, height) {
    const colors = {
      1: { icon: '#FFD700', text: '#997A00' }, // Gold with darker text
      2: { icon: '#C0C0C0', text: '#666666' }, // Silver with darker text
      3: { icon: '#CD7F32', text: '#7A4214' }  // Bronze with darker text
    };
    const c = colors[place] || colors[3];
    const hoverText = this.localize('podium_hover', { place: place, name: user.name, points: user.points });
    return `
      <div class="podium-place place-${place}" title="${hoverText}">
        <div class="trophy-container">
          <ha-icon icon="mdi:trophy" class="trophy-icon" style="color: ${c.icon}; --mdc-icon-size: 55px;"></ha-icon>
          <div class="place-number" style="color: ${c.text};">${place}</div>
        </div>
        <div class="step" style="height: ${height}px; position: relative; z-index: 1;">
          <div class="step-label" style="text-align: center; white-space: normal; line-height: 1.2;">
            ${user.name.split(' ')[0]}<br>
            ${user.points} ${this.localize('pts')}
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Editor for TaskOrganizerLeaderboard.
 */
class TaskOrganizerLeaderboardEditor extends HTMLElement {
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
    return TaskOrganizerLeaderboard._localize(this._hass, key);
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (this._rendered) {
        this._updateUI();
        return;
    }
    this.innerHTML = `
      <div class="card-config">
        <ha-textfield label="${this.localize('title_lbl')}" value="${this._config.title || this.localize('title')}" configValue="title"></ha-textfield>
        <div style="display: flex; gap: 8px;">
          <ha-textfield label="${this.localize('height_lbl')}" placeholder="400px" value="${this._config.card_height || ''}" configValue="card_height" style="flex:1"></ha-textfield>
          <ha-textfield label="${this.localize('width_lbl')}" placeholder="100%" value="${this._config.card_width || ''}" configValue="card_width" style="flex:1"></ha-textfield>
        </div>
        <ha-formfield label="${this.localize('show_history_lbl')}">
          <ha-checkbox ${this._config.show_history !== false ? 'checked' : ''} configValue="show_history"></ha-checkbox>
        </ha-formfield>
      </div>
      <style>
        .card-config ha-textfield { display: block; margin-bottom: 8px; }
      </style>
    `;

    this._rendered = true;
    this.querySelectorAll('ha-textfield').forEach(el => el.addEventListener('input', ev => this._valueChanged(ev)));
    this.querySelectorAll('ha-checkbox').forEach(el => el.addEventListener('change', ev => this._valueChanged(ev)));
    this._updateUI();
  }

  _updateUI() {
    if (!this._rendered) return;
    this.querySelectorAll('[configValue]').forEach(el => {
        const key = el.getAttribute('configValue');
        const value = this._config[key];
        if (el.tagName === 'HA-CHECKBOX') {
            el.checked = value !== false;
        } else if (value !== undefined) {
            el.value = value;
        }
    });
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    ev.stopPropagation();
    const target = ev.target;
    const configValue = target.configValue || target.getAttribute('configValue');
    let newValue = target.value;

    if (target.tagName === 'HA-CHECKBOX') {
      newValue = target.checked;
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

customElements.define('task-organizer-leaderboard-editor', TaskOrganizerLeaderboardEditor);
customElements.define('task-organizer-leaderboard', TaskOrganizerLeaderboard);