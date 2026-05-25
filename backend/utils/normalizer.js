// backend/utils/normalizer.js

/**
 * Normalizes text by removing Polish diacritics and converting to lowercase
 * @param {string} str Input string
 * @returns {string} Normalized string
 */
export function normalizeText(str) {
  if (!str) return '';
  return str.toString().toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/ó/g, 'o')
    .replace(/ż/g, 'z')
    .replace(/ź/g, 'z')
    .replace(/ś/g, 's')
    .replace(/ą/g, 'a')
    .replace(/ę/g, 'e')
    .replace(/ć/g, 'c')
    .replace(/ń/g, 'n');
}
