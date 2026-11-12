/**
 * Renders a checkbox component compatible with Home Assistant 2024.11+ / 2026.11+ and legacy versions.
 * In modern Home Assistant, ha-formfield has been removed and ha-checkbox takes its label in its default slot.
 * In legacy Home Assistant, ha-formfield wraps the ha-checkbox with a label property.
 *
 * @param {object} options - Options for the checkbox.
 * @param {string} options.label - The label to display for the checkbox.
 * @param {string} [options.id] - Element ID.
 * @param {string} [options.className] - CSS class names.
 * @param {string} [options.value] - Value attribute.
 * @param {boolean} [options.checked] - Checked state.
 * @param {boolean} [options.disabled] - Disabled state.
 * @param {string} [options.style] - Inline CSS styles.
 * @param {string} [options.configValue] - Config value attribute for card editors.
 * @param {object} [options.data] - Data attributes as key-value pairs.
 * @returns {string} The rendered HTML string.
 */
export function renderCheckbox({
  label = '',
  id = '',
  className = '',
  value = '',
  checked = false,
  disabled = false,
  style = '',
  configValue = '',
  data = {}
} = {}) {
  const dataAttrs = Object.entries(data)
    .map(([k, v]) => `data-${k}="${v}"`)
    .join(' ');
  const attrs = [
    id ? `id="${id}"` : '',
    className ? `class="${className}"` : '',
    value ? `value="${value}"` : '',
    checked ? 'checked' : '',
    disabled ? 'disabled' : '',
    style ? `style="${style}"` : '',
    configValue ? `configValue="${configValue}"` : '',
    dataAttrs
  ].filter(Boolean).join(' ');

  if (typeof customElements !== 'undefined' && customElements.get('ha-formfield')) {
    return `<ha-formfield label="${label}"><ha-checkbox ${attrs}></ha-checkbox></ha-formfield>`;
  }
  return `<ha-checkbox ${attrs}>${label}</ha-checkbox>`;
}

/**
 * Renders a switch component compatible with Home Assistant 2024.11+ / 2026.11+ and legacy versions.
 * In modern Home Assistant, ha-formfield has been removed and ha-switch takes its label in its default slot.
 * In legacy Home Assistant, ha-formfield wraps the ha-switch with a label property.
 *
 * @param {object} options - Options for the switch.
 * @param {string} options.label - The label to display for the switch.
 * @param {string} [options.id] - Element ID.
 * @param {string} [options.className] - CSS class names.
 * @param {boolean} [options.checked] - Checked state.
 * @param {boolean} [options.disabled] - Disabled state.
 * @param {string} [options.style] - Inline CSS styles.
 * @param {string} [options.configValue] - Config value attribute for card editors.
 * @returns {string} The rendered HTML string.
 */
export function renderSwitch({
  label = '',
  id = '',
  className = '',
  checked = false,
  disabled = false,
  style = '',
  configValue = ''
} = {}) {
  const attrs = [
    id ? `id="${id}"` : '',
    className ? `class="${className}"` : '',
    checked ? 'checked' : '',
    disabled ? 'disabled' : '',
    style ? `style="${style}"` : '',
    configValue ? `configValue="${configValue}"` : ''
  ].filter(Boolean).join(' ');

  if (typeof customElements !== 'undefined' && customElements.get('ha-formfield')) {
    return `<ha-formfield label="${label}"><ha-switch ${attrs}></ha-switch></ha-formfield>`;
  }
  return `<ha-switch ${attrs}>${label}</ha-switch>`;
}

