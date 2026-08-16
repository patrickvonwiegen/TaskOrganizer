const _v = Date.now();
const { en } = await import(`../translations/en.js?v=${_v}`);
const { de } = await import(`../translations/de.js?v=${_v}`);

const TRANSLATIONS = { en, de };

/**
 * Translates a given key based on the Home Assistant language.
 * @param {object} hass - The Home Assistant object.
 * @param {string} key - The translation key.
 * @param {object} replace - Object with parameters to replace in string.
 * @param {string|boolean} dictType - The dictionary to use ('card', 'protocol', 'leaderboard', 'settings', 'stats'). Boolean supported for legacy (isProtocol).
 * @returns {string} - The translated text.
 */
export function localize(hass, key, replace = null, dictType = 'card') {
  const lang = (hass && hass.language) ? hass.language.substring(0, 2) : 'en';

  let dictKey = dictType === true ? 'protocol' : (dictType === false ? 'card' : dictType);

  const dictObj = TRANSLATIONS[lang] || TRANSLATIONS['en'];
  const dict = dictObj[dictKey] || {};

  const defaultDictObj = TRANSLATIONS['en'];
  const defaultDict = defaultDictObj[dictKey] || {};

  let text = dict[key] || defaultDict[key] || key;

  if (replace) {
    for (const [k, v] of Object.entries(replace)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
