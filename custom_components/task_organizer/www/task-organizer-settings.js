/**
 * Configuration for translations.
 * en: English translations.
 * de: German translations.
 */
const I18N_SETTINGS = {
  en: { 
    title: "Settings", colors: "Colors (Done, Due, Overdue)", c_done: "Done", c_due: "Due", c_overdue: "Overdue", 
    days_overdue: "Overdue after (Days)", save: "Save Settings", advanced: "ADVANCED SETTINGS", 
    archive_btn: "Archive and reset monthly points now", factory_btn: "🔥 Factory reset (Delete everything)", 
    success: "Settings saved!", confirm_reset: "Do you really want to reset all points? Data will be archived.", 
    confirm_factory: "WARNING: This permanently deletes ALL tasks, points, and history!",
    import_export: "IMPORT / EXPORT", export_btn: "Export Tasks", import_btn: "Import Tasks", 
    import_success: "Tasks successfully imported!", import_error: "Error reading file. Is it valid JSON?",
    save_hover: "Saves the current color and day settings.",
    export_hover: "Downloads all current tasks as a JSON file.",
    import_hover: "Opens a dialog to select a JSON file for importing tasks."
  },
  de: { 
    title: "Einstellungen", colors: "Farben (Erledigt, Fällig, Überfällig)", c_done: "Erledigt", c_due: "Fällig", c_overdue: "Überfällig", 
    days_overdue: "Überfällig nach (Tagen)", save: "Einstellungen speichern", advanced: "ERWEITERTE EINSTELLUNGEN", 
    archive_btn: "Monats-Punkte archivieren und zurücksetzen", factory_btn: "🔥 Werkseinstellungen setzen (Alles löschen)", 
    success: "Einstellungen erfolgreich gespeichert!", confirm_reset: "Möchtest du alle monatlichen Punkte wirklich auf 0 setzen? Die Daten werden archiviert.", 
    confirm_factory: "ACHTUNG: Dies löscht unwiderruflich ALLE Aufgaben, Punkte und die Historie!", 
    import_export: "IMPORT / EXPORT", export_btn: "Aufgaben exportieren", import_btn: "Aufgaben importieren", 
    import_success: "Aufgaben erfolgreich importiert!", import_error: "Fehler beim Lesen der Datei. Ist es valides JSON?",
    save_hover: "Speichert die aktuellen Farb- und Tageseinstellungen.",
    export_hover: "Lädt alle aktuellen Aufgaben als JSON-Datei herunter.",
    import_hover: "Öffnet einen Dialog zur Auswahl einer JSON-Datei für den Import von Aufgaben."
  }
};

/**
 * Register card in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-settings",
  name: "Task Organizer Settings",
  description: "Displays and manages integration settings, colors, and imports/exports.",
  preview: true,
});

class TaskOrganizerSettings extends HTMLElement {
  /**
   * Initializes the TaskOrganizerSettings element.
   */
  constructor() {
    super(); 
    this.attachShadow({ mode: 'open' });
    
    // Global properties
    this.settings = { color_done: '#4CAF50', color_due: '#FFC107', color_overdue: '#F44336', overdue_days: 5 };
    this.tasks = {};
    this._dataLoaded = false; 
    this._advancedOpen = false; 
    this._ieOpen = false; 
    this._unsubEvents = null;
  }

  /**
   * Translates a given key based on the Home Assistant language.
   * * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  localize(key) { 
    const lang = (this._hass && this._hass.language) ? this._hass.language.substring(0, 2) : 'en'; 
    const dict = I18N_SETTINGS[lang] || I18N_SETTINGS['en']; 
    return dict[key] || key; 
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
  static getStubConfig() { 
    return { type: "custom:task-organizer-settings", show_advanced: false }; 
  }

  /**
   * Sets the configuration from Home Assistant.
   * * @param {object} config - The card configuration.
   */
  setConfig(config) { 
    this._config = config; 
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
      this._fetchData();
    }, "task_organizer_updated"); 
  }

  /**
   * Sets the Home Assistant object.
   */
  set hass(hass) {
    this._hass = hass;
    if (!this._dataLoaded && this._hass) { 
      this._fetchData(); 
      this._dataLoaded = true; 
    }
    if (!this._unsubEvents) { 
      this._subscribeToUpdates(); 
    }
  }

  /**
   * Fetches the current settings and tasks from the backend.
   */
  _fetchData() { 
    this._hass.callWS({ type: 'task_organizer/get_data' }).then((data) => { 
      if (data.settings && Object.keys(data.settings).length > 0) { 
        this.settings = { ...this.settings, ...data.settings }; 
      } 
      this.tasks = data.tasks || {};
      this._render(); 
    }); 
  }
  
  /**
   * Gathers modified settings from the UI and saves them via websocket.
   */
  _saveSettings() { 
    const newSettings = { 
      color_done: this.shadowRoot.getElementById('c-done').value, 
      color_due: this.shadowRoot.getElementById('c-due').value, 
      color_overdue: this.shadowRoot.getElementById('c-overdue').value, 
      overdue_days: parseInt(this.shadowRoot.getElementById('num-overdue').value) 
    }; 
    
    this._hass.callWS({ type: 'task_organizer/update_settings', settings: newSettings }).then(() => { 
      alert(this.localize('success')); 
      this._fetchData(); 
    }); 
  }
  
  /**
   * Triggers a manual reset of the monthly points.
   */
  _triggerReset() { 
    if (confirm(this.localize('confirm_reset'))) { 
      this._hass.callService('task_organizer', 'reset_monthly_points', {}).then(() => { 
        this._fetchData(); 
      }); 
    } 
  }

  /**
   * Triggers a full factory reset of the integration.
   */
  _factoryReset() { 
    if (confirm(this.localize('confirm_factory'))) { 
      this._hass.callWS({ type: 'task_organizer/factory_reset' }).then(() => { 
        location.reload(); 
      }); 
    } 
  }
  
  /**
   * Toggles the visibility of the advanced settings section.
   */
  _toggleAdvanced() { 
    this._advancedOpen = !this._advancedOpen; 
    this._render(); 
  }

  /**
   * Toggles the visibility of the import/export section.
   */
  _toggleIE() { 
    this._ieOpen = !this._ieOpen; 
    this._render(); 
  }

  /**
   * Generates a JSON file containing all tasks and prompts a download.
   */
  _exportTasks() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.tasks, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "task_organizer_tasks.json");
    
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  /**
   * Handles the file input change event to read and import JSON tasks.
   * * @param {Event} event - The file input change event.
   */
  _handleImport(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTasks = JSON.parse(e.target.result);
        this._hass.callWS({ type: 'task_organizer/import_tasks', tasks: importedTasks }).then(() => {
          alert(this.localize('import_success'));
          this._fetchData();
        });
      } catch (err) {
        alert(this.localize('import_error'));
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input to allow the same file again
  }

  /**
   * Generates the custom CSS for the card view.
   */
  _getStyles() {
    return `
      <style> 
        :host { display: block; width: 100%; } * { box-sizing: border-box; } 
        ha-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; } 
        .header { font-size: 20px; font-weight: bold; margin-bottom: 10px; } 
        .setting-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--card-background-color); border-radius: 8px; border: 1px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow, 0 2px 2px rgba(0,0,0,0.1)); margin-bottom: 8px; } 
        .setting-label { font-weight: bold; font-size: 14px; color: var(--primary-text-color); } 
        .color-group { display: flex; gap: 8px; }
        input[type="color"] { width: 35px; height: 35px; border: none; border-radius: 6px; cursor: pointer; background: none; padding: 0; } 
        input[type="number"] { width: 60px; padding: 6px; border: 1px solid var(--divider-color); border-radius: 6px; background: var(--primary-background-color); color: var(--primary-text-color); text-align: center; } 
        .btn { padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; font-size: 14px; width: 100%; } 
        .btn:active { opacity: 0.7; } 
        .collapsible-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 5px; cursor: pointer; margin-top: 5px; border-top: 1px solid var(--divider-color); color: var(--secondary-text-color); font-size: 13px; font-weight: bold; } 
        .collapsible-content { display: none; flex-direction: column; gap: 10px; padding-top: 5px; } 
        .collapsible-content.open { display: flex; }
        /* Specific button colors */
        .btn-save { background: #2196F3; color: white; margin-top: 8px; } 
        .btn-reset { background: #FF9800; color: white; } 
        .btn-factory { background: #F44336; color: white; } 
        .btn-export { background: #2196F3; color: white; }
        .btn-import { background: #2196F3; color: white; }
      </style>
    `;
  }

  /**
   * Renders the HTML content.
   */
  _render() {
    if (!this._config || !this._hass) {
      return;
    }
    
    const displayTitle = this._config.title || this.localize('title');
    const showAdvanced = this._config.show_advanced === true;

    let html = this._getStyles();
    
    // Add Main Layout
    html += `
      <ha-card>
        <div class="header">${displayTitle}</div>
        
        <div class="setting-row">
          <span class="setting-label">${this.localize('colors')}</span>
          <div class="color-group">
            <input type="color" id="c-done" value="${this.settings.color_done}" title="${this.localize('c_done')}">
            <input type="color" id="c-due" value="${this.settings.color_due}" title="${this.localize('c_due')}">
            <input type="color" id="c-overdue" value="${this.settings.color_overdue}" title="${this.localize('c_overdue')}">
          </div>
        </div>
        
        <div class="setting-row">
          <span class="setting-label">${this.localize('days_overdue')}</span>
          <input type="number" id="num-overdue" min="1" value="${this.settings.overdue_days}">
        </div>
        
        <button class="btn btn-save" id="btn-save" title="${this.localize('save_hover')}">${this.localize('save')}</button>
        
        <div class="collapsible-header" id="ie-toggle">
          <span>${this.localize('import_export')}</span>
          <ha-icon icon="${this._ieOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon>
        </div>
        <div class="collapsible-content ${this._ieOpen ? 'open' : ''}">
          <button class="btn btn-export" id="btn-export" title="${this.localize('export_hover')}">${this.localize('export_btn')}</button>
          <input type="file" id="file-import" accept=".json" style="display:none;">
          <button class="btn btn-import" id="btn-import-trigger" title="${this.localize('import_hover')}">${this.localize('import_btn')}</button>
        </div>

        ${showAdvanced ? `
          <div class="collapsible-header" id="adv-toggle" style="margin-top: 15px;">
            <span>${this.localize('advanced')}</span>
            <ha-icon icon="${this._advancedOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon>
          </div>
          <div class="collapsible-content ${this._advancedOpen ? 'open' : ''}">
            <button class="btn btn-reset" id="btn-reset" title="${this.localize('confirm_reset')}">${this.localize('archive_btn')}</button>
            <button class="btn btn-factory" id="btn-factory" title="${this.localize('confirm_factory')}">${this.localize('factory_btn')}</button>
          </div>
        ` : ''}
        
      </ha-card>
    `;
    
    this.shadowRoot.innerHTML = html;
    
    // Bind Event Listeners
    this.shadowRoot.getElementById('btn-save').addEventListener('click', () => this._saveSettings());
    
    this.shadowRoot.getElementById('ie-toggle').addEventListener('click', () => this._toggleIE());
    this.shadowRoot.getElementById('btn-export').addEventListener('click', () => this._exportTasks());
    
    this.shadowRoot.getElementById('btn-import-trigger').addEventListener('click', () => {
      this.shadowRoot.getElementById('file-import').click();
    });
    this.shadowRoot.getElementById('file-import').addEventListener('change', (ev) => this._handleImport(ev));

    if (showAdvanced) {
      this.shadowRoot.getElementById('adv-toggle').addEventListener('click', () => this._toggleAdvanced());
      this.shadowRoot.getElementById('btn-reset').addEventListener('click', () => this._triggerReset());
      this.shadowRoot.getElementById('btn-factory').addEventListener('click', () => this._factoryReset());
    }
  }
}

customElements.define('task-organizer-settings', TaskOrganizerSettings);