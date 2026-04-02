/**
 * Configuration for translations.
 * en: English translations.
 * de: German translations.
 */
const I18N_BOARD = {
  en: { title: "Roommate of the Month", no_points: "No points this month.", unknown: "Unknown", pts: "Pts", today: "Today", month: "Month", year: "Year", winner: "Winner", history: "History", podium_hover: "{place}. Place: {name} ({points} Pts)", history_hover: "Winner in {month} {year}: {name} with {points} points" },
  de: { title: "Mitbewohner des Monats", no_points: "Keine Punkte diesen Monat.", unknown: "Unbekannt", pts: "Pkt", today: "Heute", month: "Monat", year: "Jahr", winner: "Sieger", history: "Historie", podium_hover: "{place}. Platz: {name} ({points} Pkt)", history_hover: "Sieger im {month} {year}: {name} mit {points} Punkten" }
};

/**
 * Register card in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-leaderboard",
  name: "Task Organizer Leaderboard",
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
   * Translates a given key based on the Home Assistant language.
   * * @param {string} key - The translation key.
   * @param {object} replace - Object with parameters to replace in string.
   * @returns {string} - The translated text.
   */
  localize(key, replace = null) { 
    const lang = (this._hass && this._hass.language) ? this._hass.language.substring(0, 2) : 'en'; 
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
  static getStubConfig() { 
    return { 
      type: "custom:task-organizer-leaderboard", 
      show_history: true 
    }; 
  }

  /**
   * Sets the configuration from Home Assistant.
   * * @param {object} config - The card configuration.
   */
  setConfig(config) { 
    this.config = config; 
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
    return `
      <style> 
        :host { display: block; width: 100%; } 
        ha-card { padding: 16px; text-align: center; width: 100%; box-sizing: border-box; } 
        .header { font-size: 20px; font-weight: bold; margin-bottom: 24px; } 
        .period-text { font-size: 12px; font-weight: normal; color: var(--secondary-text-color); margin-top: 4px; } 
        .podium-container { display: flex; justify-content: center; align-items: flex-end; gap: 8px; height: 180px; } 
        .podium-place { display: flex; flex-direction: column; align-items: center; width: 30%; position: relative; } 
        .name { font-size: 14px; font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } 
        .points-badge { background: var(--accent-color, #ff9800); color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 5px; z-index: 3; } 
        .trophy-icon { margin-bottom: -15px; z-index: 4; filter: drop-shadow(0 3px 3px rgba(0,0,0,0.3)); } 
        .step { width: 100%; display: flex; align-items: flex-start; justify-content: center; padding-top: 15px; font-size: 24px; font-weight: bold; color: rgba(255,255,255,0.8); border-top-left-radius: 8px; border-top-right-radius: 8px;} 
        /* Colors for the podium steps: Gold, Silver, Bronze */
        .place-1 .step { height: 100px; background: linear-gradient(to top, #FFD700, #FDB931); } 
        .place-2 .step { height: 70px; background: linear-gradient(to top, #C0C0C0, #E0E0E0); } 
        .place-3 .step { height: 45px; background: linear-gradient(to top, #CD7F32, #D2B48C); }
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
      
      // Render the podium
      html += `<div class="podium-container">`;
      if (second) {
        html += this.generatePodiumHTML(second, 2);
      }
      if (first) {
        html += this.generatePodiumHTML(first, 1);
      }
      if (third) {
        html += this.generatePodiumHTML(third, 3);
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
   * @returns {string} - The HTML string for the podium step.
   */
  generatePodiumHTML(user, place) {
    let trophyColor = place === 1 ? '#FFD700' : (place === 2 ? '#C0C0C0' : '#CD7F32'); // Gold, Silver, Bronze
    const hoverText = this.localize('podium_hover', { place: place, name: user.name, points: user.points });
    return `
      <div class="podium-place place-${place}" title="${hoverText}">
        <div class="name">${user.name.split(' ')[0]}</div>
        <div class="points-badge">${user.points} ${this.localize('pts')}</div>
        <ha-icon icon="mdi:trophy" class="trophy-icon" style="color: ${trophyColor}; --mdc-icon-size: 45px;"></ha-icon>
        <div class="step">${place}</div>
      </div>
    `;
  }
}

customElements.define('task-organizer-leaderboard', TaskOrganizerLeaderboard);