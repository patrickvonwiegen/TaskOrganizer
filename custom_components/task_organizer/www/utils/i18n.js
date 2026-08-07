export const I18N_CARD = {
  en: { 
    title: "Household Tasks", unknown: "Unknown", done: "Done!", saved: "Saved", 
    deleted: "Deleted", confirm_delete: "Really delete this task?", today: "Today", 
    in_days: "in {days} days", ago_days: "{days} days ago", points: "pts.", 
    no_desc: "No description", who_did_it: "Who did it?", fair_points: "Adjust the work shares to keep it fair.", distribute_fairly: "Distribute Fairly", assign_all: "Assign",
    cancel: "Cancel", confirm: "Confirm", save: "Save", task: "Task", name_lbl: "Name", 
    desc_lbl: "Description (optional)", desc_placeholder: "Additional info...",
    interval_lbl: "Days (Interval)", points_lbl: "Points (1-10)", icon_lbl: "Icon", 
    assignees_lbl: "Assignees", select_one: "Please select at least one person!", 
    task_type: "Task Type", onetime: "One-time", recurring: "Recurring",
    recreate_task_prompt: "Create '{taskName}' from a template?",
    set_due_today: "Set due date", pause_until: "Pause until", restrict_months_lbl: "Restrict to months", paused: "Paused until {date}", due_date_lbl: "Due Date", area_lbl: "Area", area_placeholder: "e.g. Kitchen",
    override_overdue_lbl: "Task specific overdue", override_overdue_days_placeholder: "Days",
    time_settings: "Time Settings", subtasks: "Subtasks", seasonal_pause: "Seasonal Pause",
    add_subtask: "Add Subtask", subtask_placeholder: "Subtask title...",
    completed_percent: "{percent}%",
    confirm_task_complete: "All subtasks are done. Do you want to complete the main task now?",
    complete_subtasks: "Complete Subtasks",
    complete_subtasks_desc: "Complete some subtasks now or finish the main task completely.",
    prev: "Previous", next: "Next", page: "Page", 
    search_placeholder: "Search tasks...",
    all_done: "All done", 
    height_lbl: "Height", width_lbl: "Width", title_lbl: "Title",
    items_per_page_lbl: "Items per Page",
    show_search_lbl: "Show Search",
    show_add_lbl: "Show Add Button",
    show_edit_lbl: "Show Edit Button",
    show_delete_lbl: "Show Delete Button",
    sort_by_lbl: "Sort By",
    sort_by_placeholder: "due_date, points, assignee, alphabet",
    sort_order_lbl: "Sort Order",
    sort_order_placeholder: "default, asc, desc",
    filter_by_lbl: "Filter By",
    filter_by_placeholder: "comma separated, e.g. !paused, due",
    search_btn: "Search", add_task_btn: "Add Task", clear_btn: "Clear",
    help_link: "Configuration Guide (README)",
    tab_general: "General", tab_time: "Time Settings", tab_subtasks: "Subtasks", tab_other: "Other", tab_history: "Audit Log", no_history: "No audit log available"
  },
  de: { 
    title: "Haushaltsliste", unknown: "Unbekannt", done: "Aufgabe erledigt!", saved: "Gespeichert", 
    deleted: "Gelöscht", confirm_delete: "Aufgabe wirklich löschen?", today: "Heute", 
    in_days: "in {days} Tage(n)", ago_days: "vor {days} Tage(n)", points: "Pkt.", 
    no_desc: "Keine Beschreibung", who_did_it: "Wer hat's gemacht?", fair_points: "Stelle die Arbeitsanteile ein, damit es fair bleibt.", distribute_fairly: "Gleichmäßig aufteilen", assign_all: "Zuweisen",
    cancel: "Abbrechen", confirm: "Bestätigen", save: "Speichern", task: "Aufgabe", name_lbl: "Name", 
    desc_lbl: "Beschreibung (optional)", desc_placeholder: "Zusätzliche Infos...", 
    interval_lbl: "Tage (Intervall)", points_lbl: "Punkte (1-10)", icon_lbl: "Icon", 
    assignees_lbl: "Bearbeiter", select_one: "Bitte mindestens eine Person auswählen!", 
    task_type: "Aufgabentyp", onetime: "Einmalig", recurring: "Wiederkehrend",
    recreate_task_prompt: "Möchtest du '{taskName}' aus einer Vorlage erstellen?",
    set_due_today: "Fälligkeit setzen", pause_until: "Pausieren bis", restrict_months_lbl: "Auf Monate beschränken", paused: "Pausiert bis {date}", due_date_lbl: "Fälligkeit", area_lbl: "Bereich", area_placeholder: "z.B. Küche",
    override_overdue_lbl: "Aufgabenspezifische Überfälligkeit", override_overdue_days_placeholder: "Tage",
    time_settings: "Zeit", subtasks: "Unteraufgaben", seasonal_pause: "Saisonale Pause",
    add_subtask: "Unteraufgabe hinzufügen", subtask_placeholder: "Titel der Unteraufgabe...",
    completed_percent: "{percent}%",
    confirm_task_complete: "Alle Unteraufgaben sind erledigt. Möchtest du die Hauptaufgabe jetzt abschließen?",
    complete_subtasks: "Unteraufgaben abschließen",
    complete_subtasks_desc: "Schließen Sie jetzt einige Unteraufgaben ab oder schließen Sie die Aufgabe komplett ab.",
    prev: "Zurück", next: "Weiter", page: "Seite", 
    search_placeholder: "Aufgaben suchen...",
    all_done: "Alles erledigen", 
    height_lbl: "Höhe", width_lbl: "Breite", title_lbl: "Titel",
    items_per_page_lbl: "Einträge pro Seite",
    show_search_lbl: "Suche anzeigen",
    show_add_lbl: "Hinzufügen-Button anzeigen",
    show_edit_lbl: "Bearbeiten-Button anzeigen",
    show_delete_lbl: "Löschen-Button anzeigen",
    sort_by_lbl: "Sortieren nach",
    sort_by_placeholder: "due_date, points, assignee, alphabet",
    sort_order_lbl: "Sortierreihenfolge",
    sort_order_placeholder: "default, asc, desc",
    filter_by_lbl: "Filtern nach",
    filter_by_placeholder: "Kommagetrennt, z.B. !paused, due",
    search_btn: "Suchen", add_task_btn: "Aufgabe hinzufügen", clear_btn: "Leeren",
    help_link: "Konfigurations-Handbuch (README)",
    tab_general: "Allgemein", tab_time: "Zeit", tab_subtasks: "Unteraufgaben", tab_other: "Sonstiges", tab_history: "Protokoll", no_history: "Kein Protokoll vorhanden"
  }
};

export const I18N_PROTOCOL = { 
  en: {
    title: "Household Protocol", empty: "No entries.", unknown: "Unknown",
    confirm_delete: "Really delete this entry?", edit: "Edit", points: "Points",
    user: "Assignee", cancel: "Cancel", save: "Save",
    prev: "Previous", next: "Next", page: "Page",
    edit_hover: "Edit entry", delete_hover: "Delete entry",
    entry_saved: "Entry saved!", entry_deleted: "Entry deleted!",
    height_lbl: "Height", width_lbl: "Width", title_lbl: "Title",
    items_per_page_lbl: "Items per Page", filter_by_lbl: "Filter By"
  },
  de: { 
    title: "Haushaltsprotokoll", empty: "Keine Einträge.", unknown: "Unbekannt", 
    confirm_delete: "Eintrag wirklich löschen?", edit: "Korrigieren", points: "Punkte", 
    user: "Bearbeiter", cancel: "Abbrechen", save: "Speichern",
    prev: "Zurück", next: "Weiter", page: "Seite",
    edit_hover: "Eintrag bearbeiten", delete_hover: "Eintrag löschen",
    entry_saved: "Eintrag gespeichert!", entry_deleted: "Eintrag gelöscht!",
    height_lbl: "Höhe", width_lbl: "Breite", title_lbl: "Titel",
    items_per_page_lbl: "Einträge pro Seite", filter_by_lbl: "Filtern nach"
  }
};

/**
 * Translates a given key based on the Home Assistant language.
 * @param {object} hass - The Home Assistant object.
 * @param {string} key - The translation key.
 * @param {object} replace - Object with parameters to replace in string.
 * @param {boolean} isProtocol - Whether to use the protocol dictionary.
 * @returns {string} - The translated text.
 */
export function localize(hass, key, replace = null, isProtocol = false) {
  const lang = (hass && hass.language) ? hass.language.substring(0, 2) : 'en';
  const dict = isProtocol ? (I18N_PROTOCOL[lang] || I18N_PROTOCOL['en']) : (I18N_CARD[lang] || I18N_CARD['en']);
  const defaultDict = isProtocol ? I18N_PROTOCOL['en'] : I18N_CARD['en'];
  let text = dict[key] || defaultDict[key] || key;
  
  if (replace) { 
    for (const [k, v] of Object.entries(replace)) { 
      text = text.replace(`{${k}}`, v); 
    } 
  }
  return text;
}
