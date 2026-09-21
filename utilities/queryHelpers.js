/**
 * Safely parses and constrains pagination parameters from a query object.
 * @param {Object} query - The request query object (req.query)
 * @param {number} defaultLimit - Default items per page (default 10)
 * @param {number} maxLimit - Maximum allowed items per page to prevent DoS (default 100)
 * @returns {{ page: number, limit: number, skip: number }}
 */
const getPagination = (query = {}, defaultLimit = 10, maxLimit = 100) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) {
    page = 1;
  }

  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  } else if (limit > maxLimit) {
    limit = maxLimit;
  }

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Formats standard pagination metadata response.
 * @param {number} total - Total document count
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {{ total: number, page: number, limit: number, pages: number }}
 */
const formatPagination = (total, page, limit) => {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Escapes regex special characters in a search string to prevent ReDoS / query errors.
 * @param {string} text - User-provided search string
 * @returns {string} Escaped string safe for RegExp / $regex
 */
const escapeRegex = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  getPagination,
  formatPagination,
  escapeRegex,
};
