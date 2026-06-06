// Small shared validators.

// RFC-4122 UUID format check. Used to reject malformed :id params BEFORE they
// reach Postgres (an invalid uuid otherwise throws 22P02 → an ugly 500 that
// leaks the DB error). Guarding lets routes return a clean 400/404 instead.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

module.exports = { isUuid };
