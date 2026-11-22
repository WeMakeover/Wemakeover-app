/**
 * Minimal Mongoose-style query/filter helpers backed by Prisma.
 * Supports the operators and chain methods this codebase actually uses.
 */

export function parseSelect(select) {
  if (!select) {
    return { mode: 'default', include: null, exclude: new Set() };
  }

  if (typeof select === 'object' && !Array.isArray(select)) {
    const include = [];
    const exclude = new Set();
    for (const [key, val] of Object.entries(select)) {
      if (val === 0 || val === false) exclude.add(key);
      else include.push(key);
    }
    return {
      mode: include.length ? 'include' : 'exclude',
      include: include.length ? include : null,
      exclude,
    };
  }

  const tokens = String(select)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const include = [];
  const exclude = new Set();
  let forceIncludePassword = false;

  for (const token of tokens) {
    if (token === '+password') {
      forceIncludePassword = true;
      continue;
    }
    if (token.startsWith('-')) {
      exclude.add(token.slice(1));
    } else if (token.startsWith('+')) {
      include.push(token.slice(1));
    } else {
      include.push(token);
    }
  }

  return {
    mode: include.length ? 'include' : 'exclude',
    include: include.length ? include : null,
    exclude,
    forceIncludePassword,
  };
}

function mapFieldName(field, fieldMap = {}) {
  if (field === '_id') return 'id';
  return fieldMap[field] ?? field;
}

function translateValue(value, fieldMap) {
  if (value == null || typeof value !== 'object' || value instanceof Date || Array.isArray(value)) {
    return value;
  }

  if (value.$regex != null) {
    return {
      contains: String(value.$regex),
      mode: String(value.$options || '').includes('i') ? 'insensitive' : 'default',
    };
  }

  const ops = {};
  if (value.$ne !== undefined) ops.not = value.$ne;
  if (value.$gt !== undefined) ops.gt = value.$gt;
  if (value.$gte !== undefined) ops.gte = value.$gte;
  if (value.$lt !== undefined) ops.lt = value.$lt;
  if (value.$lte !== undefined) ops.lte = value.$lte;
  if (value.$in !== undefined) ops.in = value.$in;
  if (value.$nin !== undefined) ops.notIn = value.$nin;

  if (Object.keys(ops).length) return ops;

  // Nested plain object — leave as-is (rare)
  return value;
}

/**
 * Convert a Mongo-like filter to a Prisma `where` clause.
 * @param {object} filter
 * @param {Record<string,string>} fieldMap API field → Prisma field
 */
export function toPrismaWhere(filter = {}, fieldMap = {}) {
  if (!filter || typeof filter !== 'object') return {};

  if (filter.$or) {
    return {
      OR: filter.$or.map((part) => toPrismaWhere(part, fieldMap)),
    };
  }

  if (filter.$and) {
    return {
      AND: filter.$and.map((part) => toPrismaWhere(part, fieldMap)),
    };
  }

  const where = {};

  for (const [rawKey, rawVal] of Object.entries(filter)) {
    if (rawKey.startsWith('$')) continue;

    const key = mapFieldName(rawKey, fieldMap);
    where[key] = translateValue(rawVal, fieldMap);
  }

  return where;
}

export function toPrismaOrderBy(sort = {}) {
  if (!sort || typeof sort !== 'object') return undefined;
  const entries = Object.entries(sort);
  if (!entries.length) return undefined;

  return entries.map(([field, dir]) => ({
    [field === '_id' ? 'id' : field]: dir === -1 || dir === 'desc' ? 'desc' : 'asc',
  }));
}

/**
 * Thenable query chain: .select().sort().skip().limit().populate().lean()
 */
export class QueryChain {
  constructor(executor) {
    this._executor = executor;
    this._select = null;
    this._sort = null;
    this._skip = 0;
    this._limit = null;
    this._lean = false;
    this._populates = [];
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  sort(sort) {
    this._sort = sort;
    return this;
  }

  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }

  limit(n) {
    this._limit = n == null ? null : Number(n);
    return this;
  }

  populate(path, select) {
    this._populates.push({ path, select });
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async exec() {
    return this._executor({
      select: this._select,
      sort: this._sort,
      skip: this._skip,
      limit: this._limit,
      lean: this._lean,
      populates: this._populates,
    });
  }

  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.exec().catch(onRejected);
  }
}

export function applySelectToObject(obj, selectSpec, { passwordField = 'password' } = {}) {
  if (!obj) return obj;
  const parsed = parseSelect(selectSpec);
  const out = { ...obj };

  if (parsed.mode === 'include' && parsed.include) {
    const keep = new Set(['_id', 'id', ...parsed.include]);
    if (parsed.forceIncludePassword) keep.add(passwordField);
    for (const key of Object.keys(out)) {
      if (!keep.has(key)) delete out[key];
    }
  } else if (!parsed.forceIncludePassword && passwordField in out) {
    delete out[passwordField];
  }

  for (const key of parsed.exclude) {
    delete out[key];
  }

  delete out.__v;
  return out;
}

export function pickUpdateData(update = {}) {
  if (!update || typeof update !== 'object') return {};
  if (update.$set && typeof update.$set === 'object') {
    return { ...update.$set };
  }
  const data = { ...update };
  delete data.$set;
  delete data.$unset;
  delete data.$inc;
  return data;
}
