/**
 * Configuration for translations.
 * en: English translations.
 * de: German translations.
 */
const I18N_SETTINGS = {
  en: { 
    title: "Settings", colors: "Colors (Done, Due, Overdue)", c_done: "Done", c_due: "Due", c_overdue: "Overdue", 
    days_overdue: "Overdue after (Days)", save: "Save Settings", advanced: "ADVANCED SETTINGS", cancel: "Cancel",
    archive_btn: "Archive and reset monthly points now", factory_btn: "🔥 Factory reset (Delete everything)", 
    success: "Settings saved!", confirm_reset: "Do you really want to reset all points? Data will be archived.", 
    confirm_factory: "WARNING: This permanently deletes ALL tasks, points, and history!",
    import_export: "Import & Export", export_btn: "Export Tasks", import_btn: "Import Tasks", 
    import_success: "Tasks successfully imported!", import_error: "Error reading file. Is it valid JSON?",
    templates: "Templates", templates_desc: "Manage templates for tasks here for quick reuse.",
    add_template: "Add Template", edit_template: "Edit Template", template_name: "Template Name",
    confirm_delete_template: "Do you really want to delete this template? It cannot be recovered.",
    template_saved: "Template saved!", template_deleted: "Template deleted!", no_templates: "No templates found. Create a new one!",
    template_name_placeholder: "e.g. Take out trash",
    desc_lbl: "Description (optional)", area_lbl: "Area", points_lbl: "Points (1-10)", icon_lbl: "Icon",
    success: "Settings saved!", template_saved: "Template saved!", template_deleted: "Template deleted!", import_success: "Tasks successfully imported!", import_error: "Error reading file. Is it valid JSON?",
    interval_lbl: "Days (Interval)", assignees_lbl: "Assignees",
    edit_template_hover: "Edit template", delete_template_hover: "Delete template",
    save_hover: "Saves the current color and day settings.",
    export_hover: "Downloads all current tasks as a JSON file.",
    import_hover: "Opens a dialog to select a JSON file for importing tasks.",
    export_tasks_cb: "Tasks", export_templates_cb: "Templates", export_history_cb: "History & Points"
  },
  de: { 
    title: "Einstellungen", colors: "Farben (Erledigt, Fällig, Überfällig)", c_done: "Erledigt", c_due: "Fällig", c_overdue: "Überfällig", 
    days_overdue: "Überfällig nach (Tagen)", save: "Einstellungen speichern", advanced: "ERWEITERTE EINSTELLUNGEN", cancel: "Abbrechen",
    archive_btn: "Monats-Punkte archivieren und zurücksetzen", factory_btn: "🔥 Werkseinstellungen setzen (Alles löschen)", 
    success: "Einstellungen erfolgreich gespeichert!", confirm_reset: "Möchtest du alle monatlichen Punkte wirklich auf 0 setzen? Die Daten werden archiviert.", 
    confirm_factory: "ACHTUNG: Dies löscht unwiderruflich ALLE Aufgaben, Punkte und die Historie!", 
    import_export: "Import & Export", export_btn: "Aufgaben exportieren", import_btn: "Aufgaben importieren", 
    import_success: "Aufgaben erfolgreich importiert!", import_error: "Fehler beim Lesen der Datei. Ist es valides JSON?",
    templates: "Vorlagen", templates_desc: "Verwalte hier Vorlagen für Aufgaben, um sie schnell wiederverwenden zu können.",
    add_template: "Vorlage hinzufügen", edit_template: "Vorlage bearbeiten", template_name: "Name der Vorlage",
    confirm_delete_template: "Möchtest du diese Vorlage wirklich löschen? Sie kann nicht wiederhergestellt werden.",
    template_saved: "Vorlage gespeichert!", template_deleted: "Vorlage gelöscht!", no_templates: "Keine Vorlagen vorhanden. Erstelle eine neue!",
    template_name_placeholder: "z.B. Müll rausbringen",
    desc_lbl: "Beschreibung (optional)", area_lbl: "Bereich", points_lbl: "Punkte (1-10)", icon_lbl: "Icon",
    success: "Einstellungen erfolgreich gespeichert!", template_saved: "Vorlage gespeichert!", template_deleted: "Vorlage gelöscht!", import_success: "Aufgaben erfolgreich importiert!", import_error: "Fehler beim Lesen der Datei. Ist es valides JSON?",
    interval_lbl: "Tage (Intervall)", assignees_lbl: "Bearbeiter",
    edit_template_hover: "Vorlage bearbeiten", delete_template_hover: "Vorlage löschen",
    save_hover: "Speichert die aktuellen Farb- und Tageseinstellungen.",
    export_hover: "Lädt alle aktuellen Aufgaben als JSON-Datei herunter.",
    import_hover: "Öffnet einen Dialog zur Auswahl einer JSON-Datei für den Import von Aufgaben.",
    export_tasks_cb: "Aufgaben", export_templates_cb: "Vorlagen", export_history_cb: "Protokoll & Historie"
  }
};

/**
 * Register card in the Home Assistant Card Picker.
 */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-organizer-settings",
  name: "Task Organizer: Settings",
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
    this.users = {};
    this.templates = {};
    this.history = [];
    this.points = {};
    this.monthly_history = {};
    this.current_month = null;
    this.current_period_start = null;
    this._dataLoaded = false; 
    this._advancedOpen = false; 
    this._ieOpen = false; 
    this._templatesOpen = false;
    this._templateModalOpen = false;
    this._editingTemplateId = null;
    this._unsubEvents = null;
  }

  /**
   * Statically translates a key. Helper for getStubConfig.
   * @param {object} hass - The Home Assistant object.
   * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  static _localize(hass, key) {
    const lang = (hass && hass.language) ? hass.language.substring(0, 2) : 'en';
    const dict = I18N_SETTINGS[lang] || I18N_SETTINGS['en'];
    return dict[key] || key;
  }

  /**
   * Translates a given key based on the Home Assistant language.
   * * @param {string} key - The translation key.
   * @returns {string} - The translated text.
   */
  localize(key) { 
    return TaskOrganizerSettings._localize(this._hass, key);
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
      type: "custom:task-organizer-settings", 
      title: this._localize(hass, 'title'),
      show_advanced: false 
    }; 
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
      this._mapUsers();
      this._fetchData(); 
      this._dataLoaded = true; 
    }
    if (!this._unsubEvents) { 
      this._subscribeToUpdates(); 
    }
  }

  /**
   * Maps Home Assistant 'person' entities to the local users object.
   */
  _mapUsers() {
    const users = {};
    if (!this._hass) return;
    for (const entityId in this._hass.states) {
        if (entityId.startsWith('person.')) {
            const state = this._hass.states[entityId];
            if (state.attributes.user_id) {
                users[state.attributes.user_id] = state.attributes.friendly_name || entityId;
            }
        }
    }
    this.users = users;
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
      this.templates = data.templates || {};
      this.history = data.history || [];
      this.points = data.points || {};
      this.monthly_history = data.monthly_history || {};
      this.current_month = data.current_month;
      this.current_period_start = data.current_period_start;
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

  _toggleTemplates() {
    this._templatesOpen = !this._templatesOpen;
    this._render();
  }

  _openTemplateModal(id = null) {
    this._editingTemplateId = id;
    this._templateModalOpen = true;
    this._render();
  }

  _closeTemplateModal() {
    this._templateModalOpen = false;
    this._editingTemplateId = null;
    this._render();
  }

  _saveTemplate() {
    const assignees = [];
    this.shadowRoot.querySelectorAll('.tmpl-assignee-cb').forEach(cb => {
        if (cb.checked) assignees.push(cb.value);
    });

    const payload = {
      name: this.shadowRoot.getElementById('tmpl-name').value,
      description: this.shadowRoot.getElementById('tmpl-desc').value,
      area: this.shadowRoot.getElementById('tmpl-area').value,
      complexity: parseInt(this.shadowRoot.getElementById('tmpl-complexity').value),
      icon: this.shadowRoot.getElementById('tmpl-icon').value,
      interval: parseInt(this.shadowRoot.getElementById('tmpl-interval').value),
      assignees: assignees,
    };

    if (!payload.name || !payload.icon) {
        alert("Name and Icon are required.");
        return;
    }

    const type = this._editingTemplateId ? 'task_organizer/edit_template' : 'task_organizer/add_template';
    if (this._editingTemplateId) {
      payload.template_id = this._editingTemplateId;
    }

    this._hass.callWS({ type, ...payload }).then(() => {
      this._showToast(this.localize('template_saved'));
      this._closeTemplateModal();
      this._fetchData();
    });
  }

  _showToast(message) {
    const event = new CustomEvent("hass-notification", {
        detail: { message: message, duration: 3000 },
        bubbles: true,
        composed: true
    });
    this.dispatchEvent(event);
    
    const root = document.querySelector("home-assistant");
    if (root) { 
        root.dispatchEvent(new CustomEvent("hass-notification", { detail: { message: message, duration: 3000 } })); 
    }
  }

  _deleteTemplate(id) {
    if (confirm(this.localize('confirm_delete_template'))) {
      this._hass.callWS({ type: 'task_organizer/delete_template', template_id: id })
        .then(() => {
          alert(this.localize('template_deleted'));
          this._showToast(this.localize('template_deleted'));
        });
    }
  }

  /**
   * Generates a JSON file containing all tasks and prompts a download.
   */
  _exportTasks() {
    const exportTasks = this.shadowRoot.getElementById('cb-export-tasks').checked;
    const exportTemplates = this.shadowRoot.getElementById('cb-export-templates').checked;
    const exportHistory = this.shadowRoot.getElementById('cb-export-history').checked;
    
    let dataToExport = {};
    if (exportTasks) dataToExport.tasks = this.tasks;
    if (exportTemplates) dataToExport.templates = this.templates;
    if (exportHistory) {
      dataToExport.history = this.history;
      dataToExport.points = this.points;
      dataToExport.monthly_history = this.monthly_history;
      dataToExport.current_month = this.current_month;
      dataToExport.current_period_start = this.current_period_start;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "task_organizer_export.json");
    
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
        const importedData = JSON.parse(e.target.result);
        
        let payload = { type: 'task_organizer/import_tasks' };
        
        // Detect if it's the new format containing tasks, templates, or history
        if (importedData.tasks || importedData.templates || importedData.history) {
            if (importedData.tasks) payload.tasks = importedData.tasks;
            if (importedData.templates) payload.templates = importedData.templates;
            if (importedData.history) {
                payload.history = importedData.history;
                if (importedData.points) payload.points = importedData.points;
                if (importedData.monthly_history) payload.monthly_history = importedData.monthly_history;
                if (importedData.current_month) payload.current_month = importedData.current_month;
                if (importedData.current_period_start) payload.current_period_start = importedData.current_period_start;
            }
        } else {
            // Assume old format containing only tasks directly at root
            payload.tasks = importedData;
        }

        this._hass.callWS(payload).then(() => {
          this._showToast(this.localize('import_success'));
          this._fetchData();
        });
      } catch (err) {
        this._showToast(this.localize('import_error'));
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
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 5000; justify-content: center; align-items: center; } 
        .modal.open { display: flex; } 
        .modal-content { background: var(--card-background-color); color: var(--primary-text-color); padding: 24px; border-radius: 12px; width: 90%; max-width: 450px; max-height: 90vh; overflow-y: auto; box-shadow: 0px 4px 16px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 16px; }
        .form-label { font-size: 14px; font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; display: block; } 
        .form-row { display: flex; gap: 16px; }
        .form-col { flex: 1; }
        .templates-header { display: flex; justify-content: space-between; align-items: center; }
        .template-card { display: flex; align-items: center; justify-content: space-between; background: var(--card-background-color); padding: 12px; border-radius: 8px; border: 1px solid var(--divider-color); }
        .template-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .template-text { flex: 1; min-width: 0; }
        .template-name { font-weight: bold; font-size: 15px; }
        .template-meta { font-size: 12px; color: var(--secondary-text-color); }
        .template-actions { display: flex; gap: 0; align-items: center; }
        .templates-desc { font-size: 14px; color: var(--secondary-text-color); margin: 0; }
        .no-templates-msg { text-align: center; color: var(--secondary-text-color); padding: 10px; }
        .icon-button { padding: 0; background: transparent; border: none; cursor: pointer; color: var(--primary-text-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transition: background-color 0.2s, transform 0.1s; flex-shrink: 0; }
        .icon-button:hover { background-color: var(--secondary-background-color); }
        .add-button { background: var(--primary-color, #2196F3) !important; color: white !important; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .add-button:hover { background: var(--dark-primary-color, #1976D2) !important; transform: scale(1.05); }
        
        /* Ensure icons maintain aspect ratio and scale flexibly within their buttons */
        .icon-button ha-icon {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          font-size: 24px; /* Default size, will scale down if container shrinks */
          line-height: 1; /* Ensures proper vertical alignment for font icons */
          --mdc-icon-size: 24px; /* For consistency with Home Assistant's Material Design Icons */
        }
        .action-btn { background: transparent; border: none; padding: 8px; border-radius: 50%; cursor: pointer; color: var(--secondary-text-color); transition: background-color 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; }
        .action-btn:hover { background-color: var(--divider-color); color: var(--primary-text-color); }
        .btn-edit-template { color: var(--info-color, #2196F3); } 
        .btn-delete-template { color: var(--error-color, #F44336); } 
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
    const template = this._editingTemplateId ? this.templates[this._editingTemplateId] : null;

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
          <div style="display: flex; gap: 16px; margin-bottom: 8px;">
            <ha-formfield label="${this.localize('export_tasks_cb')}">
              <ha-checkbox id="cb-export-tasks" checked></ha-checkbox>
            </ha-formfield>
            <ha-formfield label="${this.localize('export_templates_cb')}">
              <ha-checkbox id="cb-export-templates" checked></ha-checkbox>
            </ha-formfield>
            <ha-formfield label="${this.localize('export_history_cb')}">
              <ha-checkbox id="cb-export-history"></ha-checkbox>
            </ha-formfield>
          </div>
          <div style="display: flex; gap: 10px; width: 100%;">
            <button class="btn btn-export" id="btn-export" title="${this.localize('export_hover')}">${this.localize('export_btn')}</button>
            <input type="file" id="file-import" accept=".json" style="display:none;">
            <button class="btn btn-import" id="btn-import-trigger" title="${this.localize('import_hover')}">${this.localize('import_btn')}</button>
          </div>
        </div>

        <div class="collapsible-header" id="templates-toggle">
          <span>${this.localize('templates')}</span>
          <ha-icon icon="${this._templatesOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon>
        </div>
        <div class="collapsible-content ${this._templatesOpen ? 'open' : ''}" id="templates-content">
          <div class="templates-header">
            <p class="templates-desc">${this.localize('templates_desc')}</p>
            <button class="icon-button add-button" id="btn-add-template" title="${this.localize('add_template')}">
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
          <div id="template-list" style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            ${Object.values(this.templates).length > 0 ? Object.values(this.templates).map(t => `
              <div class="template-card">
                <div class="template-info">
                  <ha-icon icon="${t.icon || 'mdi:label-outline'}"></ha-icon>
                  <div class="template-text">
                    <div class="template-name">${t.name}</div>
                    <div class="template-meta">${t.area || ''}</div>
                  </div>
                </div>
                <div class="template-actions">
                  <button class="action-btn btn-edit-template" data-id="${t.id}" title="${this.localize('edit_template_hover')}"><ha-icon icon="mdi:pencil"></ha-icon></button>
                  <button class="action-btn btn-delete-template" data-id="${t.id}" title="${this.localize('delete_template_hover')}"><ha-icon icon="mdi:delete"></ha-icon></button>
                </div>
              </div>
            `).join('') : `<div class="no-templates-msg">${this.localize('no_templates')}</div>`}
          </div>
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

      <div id="template-modal" class="modal ${this._templateModalOpen ? 'open' : ''}">
        <div class="modal-content">
            <h2>${this._editingTemplateId ? this.localize('edit_template') : this.localize('add_template')}</h2>
            <div style="display:flex; flex-direction:column; gap:16px;">
              <ha-textfield id="tmpl-name" label="${this.localize('template_name')}" value="${template?.name || ''}" required></ha-textfield>
              <ha-textfield id="tmpl-desc" label="${this.localize('desc_lbl')}" value="${template?.description || ''}"></ha-textfield>
              
              <div class="form-row">
                  <ha-textfield id="tmpl-interval" type="number" label="${this.localize('interval_lbl')}" class="form-col" value="${template?.interval ?? 7}"></ha-textfield>
                  <ha-textfield id="tmpl-complexity" type="number" label="${this.localize('points_lbl')}" min="1" max="10" value="${template?.complexity || 5}" class="form-col"></ha-textfield>
              </div>

              <div class="form-row">
                  <div class="form-col">
                      <label class="form-label">${this.localize('icon_lbl')}</label>
                      <ha-icon-picker id="tmpl-icon" value="${template?.icon || 'mdi:label'}" required></ha-icon-picker>
                  </div>
                  <div class="form-col">
                      <label class="form-label">${this.localize('area_lbl')}</label>
                      <ha-area-picker id="tmpl-area" value="${template?.area || ''}"></ha-area-picker>
                  </div>
              </div>

              <div>
                  <label class="form-label">${this.localize('assignees_lbl')}</label>
                  <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px;">
                      ${Object.entries(this.users).map(([uid, name]) => {
                          const isChecked = template?.assignees?.includes(uid) || false;
                          return `
                              <ha-formfield label="${name}">
                                  <ha-checkbox class="tmpl-assignee-cb" value="${uid}" ${isChecked ? 'checked' : ''}></ha-checkbox>
                              </ha-formfield>
                          `;
                      }).join('')}
                  </div>
              </div>
            </div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:24px;">
                <ha-button id="btn-modal-cancel">${this.localize('cancel')}</ha-button>
                <ha-button raised id="btn-modal-save">${this.localize('save')}</ha-button>
            </div>
        </div>
      </div>
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

    this.shadowRoot.getElementById('templates-toggle').addEventListener('click', () => this._toggleTemplates());
    if (this._templatesOpen) {
      this.shadowRoot.getElementById('btn-add-template').addEventListener('click', () => this._openTemplateModal());
      this.shadowRoot.querySelectorAll('.btn-edit-template').forEach(btn => {
        btn.addEventListener('click', (e) => this._openTemplateModal(e.currentTarget.dataset.id));
      });
      this.shadowRoot.querySelectorAll('.btn-delete-template').forEach(btn => {
        btn.addEventListener('click', (e) => this._deleteTemplate(e.currentTarget.dataset.id));
      });
    }

    if (this._templateModalOpen) {
      const iconPicker = this.shadowRoot.getElementById('tmpl-icon');
      if(iconPicker) iconPicker.hass = this._hass;

      const areaPicker = this.shadowRoot.getElementById('tmpl-area');
      if(areaPicker) areaPicker.hass = this._hass;

      this.shadowRoot.getElementById('btn-modal-save').addEventListener('click', () => this._saveTemplate());
      this.shadowRoot.getElementById('btn-modal-cancel').addEventListener('click', () => this._closeTemplateModal());
    }

    if (showAdvanced) {
      this.shadowRoot.getElementById('adv-toggle').addEventListener('click', () => this._toggleAdvanced());
      this.shadowRoot.getElementById('btn-reset').addEventListener('click', () => this._triggerReset());
      this.shadowRoot.getElementById('btn-factory').addEventListener('click', () => this._factoryReset());
    }
  }
}

customElements.define('task-organizer-settings', TaskOrganizerSettings);