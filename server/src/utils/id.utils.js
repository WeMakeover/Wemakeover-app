/**
 * ID helpers for Postgres UUID primary keys (Phase 2+).
 * ObjectId checks are kept only where Mongo collections are still live.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Valid Postgres entity id (UUID). */
export function isValidId(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/** @deprecated Prefer isValidId for catalog/auth entities. */
export function isValidObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value.trim());
}
