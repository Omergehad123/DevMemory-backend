/**
 * Generates an SEO-friendly URL slug from any title or name string.
 * e.g. "Array.prototype.map()" -> "array-prototype-map"
 *      "React 19 & Hooks!" -> "react-19-hooks"
 *      "useState()" -> "use-state" (or "usestate")
 * @param {string} text
 * @returns {string}
 */
const slugify = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // separate accents from letters
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with -
    .replace(/^-+|-+$/g, '') // trim leading/trailing -
    .replace(/-+/g, '-'); // collapse consecutive -
};

module.exports = {
  slugify,
};
