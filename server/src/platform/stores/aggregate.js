/**
 * Minimal Mongo-style aggregation runner for Prisma-backed docs (Phase 4).
 * Supports $match, $unwind, $group, $sort, $limit used by booking/payment admin.
 */

function getPath(obj, path) {
  if (!path) return obj;
  const parts = String(path).replace(/^\$/, '').split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function matchDoc(doc, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$and') {
      return expected.every((part) => matchDoc(doc, part));
    }
    if (key === '$or') {
      return expected.some((part) => matchDoc(doc, part));
    }

    const actual = getPath(doc, key);

    if (expected && typeof expected === 'object' && !(expected instanceof Date) && !Array.isArray(expected)) {
      if (expected.$gte != null && !(new Date(actual) >= new Date(expected.$gte) || actual >= expected.$gte)) {
        return false;
      }
      if (expected.$gt != null && !(new Date(actual) > new Date(expected.$gt) || actual > expected.$gt)) {
        return false;
      }
      if (expected.$lte != null && !(new Date(actual) <= new Date(expected.$lte) || actual <= expected.$lte)) {
        return false;
      }
      if (expected.$lt != null && !(new Date(actual) < new Date(expected.$lt) || actual < expected.$lt)) {
        return false;
      }
      if (expected.$in && !expected.$in.map(String).includes(String(actual))) return false;
      if (expected.$ne != null && String(actual) === String(expected.$ne)) return false;
      if (expected.$exists === false && actual != null) return false;
      if (expected.$exists === true && actual == null) return false;
      if (
        expected.$gte == null &&
        expected.$gt == null &&
        expected.$lte == null &&
        expected.$lt == null &&
        expected.$in == null &&
        expected.$ne == null &&
        expected.$exists == null
      ) {
        // nested plain object equality not supported — treat as miss if other ops absent
        return true;
      }
      return true;
    }

    if (Array.isArray(expected)) {
      return expected.map(String).includes(String(actual));
    }

    if (actual instanceof Date || expected instanceof Date) {
      return new Date(actual).getTime() === new Date(expected).getTime();
    }

    return String(actual) === String(expected);
  });
}

function evalAccumulate(accType, current, doc, fieldExpr) {
  if (accType === '$sum') {
    if (fieldExpr === 1) return current + 1;
    if (typeof fieldExpr === 'object' && fieldExpr.$cond) {
      const [cond, tVal, fVal] = fieldExpr.$cond;
      const ok = evalCond(cond, doc);
      const add = ok ? resolveValue(tVal, doc) : resolveValue(fVal, doc);
      return current + (Number(add) || 0);
    }
    if (typeof fieldExpr === 'object' && fieldExpr.$multiply) {
      const parts = fieldExpr.$multiply.map((p) => Number(resolveValue(p, doc)) || 0);
      return current + parts.reduce((a, b) => a * b, 1);
    }
    return current + (Number(resolveValue(fieldExpr, doc)) || 0);
  }
  if (accType === '$avg') {
    // tracked separately
    return current;
  }
  if (accType === '$min') {
    const v = resolveValue(fieldExpr, doc);
    return current == null || v < current ? v : current;
  }
  if (accType === '$max') {
    const v = resolveValue(fieldExpr, doc);
    return current == null || v > current ? v : current;
  }
  if (accType === '$first') return current ?? resolveValue(fieldExpr, doc);
  return current;
}

function resolveValue(expr, doc) {
  if (expr === 1 || expr === 0 || typeof expr === 'number' || typeof expr === 'boolean') return expr;
  if (typeof expr === 'string' && expr.startsWith('$')) return getPath(doc, expr.slice(1));
  if (expr && typeof expr === 'object') {
    if (expr.$size !== undefined) {
      const arr = resolveValue(expr.$size, doc);
      return Array.isArray(arr) ? arr.length : 0;
    }
    if (expr.$subtract) {
      const [a, b] = expr.$subtract;
      return (Number(resolveValue(a, doc)) || 0) - (Number(resolveValue(b, doc)) || 0);
    }
    if (expr.$multiply) {
      return expr.$multiply.reduce((acc, part) => acc * (Number(resolveValue(part, doc)) || 0), 1);
    }
    if (expr.$add) {
      return expr.$add.reduce((acc, part) => acc + (Number(resolveValue(part, doc)) || 0), 0);
    }
  }
  return expr;
}

function evalCond(cond, doc) {
  if (!cond || typeof cond !== 'object') return Boolean(cond);
  if (cond.$eq) {
    const [a, b] = cond.$eq;
    return String(resolveValue(a, doc)) === String(resolveValue(b, doc));
  }
  if (cond.$ne) {
    const [a, b] = cond.$ne;
    return String(resolveValue(a, doc)) !== String(resolveValue(b, doc));
  }
  if (cond.$gte) {
    const [a, b] = cond.$gte;
    return resolveValue(a, doc) >= resolveValue(b, doc);
  }
  if (cond.$gt) {
    const [a, b] = cond.$gt;
    return resolveValue(a, doc) > resolveValue(b, doc);
  }
  if (cond.$lte) {
    const [a, b] = cond.$lte;
    return resolveValue(a, doc) <= resolveValue(b, doc);
  }
  if (cond.$lt) {
    const [a, b] = cond.$lt;
    return resolveValue(a, doc) < resolveValue(b, doc);
  }
  if (cond.$in) {
    const [a, arr] = cond.$in;
    return (arr || []).map(String).includes(String(resolveValue(a, doc)));
  }
  if (cond.$and) return cond.$and.every((c) => evalCond(c, doc));
  if (cond.$or) return cond.$or.some((c) => evalCond(c, doc));
  return false;
}

function groupKey(idExpr, doc) {
  if (idExpr == null) return null;
  if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
    return getPath(doc, idExpr.slice(1));
  }
  if (typeof idExpr === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(idExpr)) {
      if (typeof v === 'object' && v.$year) {
        out[k] = new Date(resolveValue(v.$year, doc)).getFullYear();
      } else if (typeof v === 'object' && v.$month) {
        out[k] = new Date(resolveValue(v.$month, doc)).getMonth() + 1;
      } else {
        out[k] = resolveValue(v, doc);
      }
    }
    return JSON.stringify(out);
  }
  return idExpr;
}

function parseGroupKey(idExpr, key) {
  if (typeof idExpr === 'object' && idExpr !== null && typeof key === 'string' && key.startsWith('{')) {
    try {
      return JSON.parse(key);
    } catch {
      return key;
    }
  }
  return key;
}

/**
 * @param {object[]} docs
 * @param {object[]} pipeline
 */
export function runAggregate(docs, pipeline = []) {
  let rows = docs.slice();

  for (const stage of pipeline) {
    if (stage.$match) {
      rows = rows.filter((doc) => matchDoc(doc, stage.$match));
      continue;
    }

    if (stage.$unwind) {
      const path = String(stage.$unwind).replace(/^\$/, '');
      const next = [];
      for (const doc of rows) {
        const arr = getPath(doc, path);
        if (!Array.isArray(arr) || arr.length === 0) continue;
        for (const item of arr) {
          next.push({ ...doc, [path.split('.')[0]]: path.includes('.') ? getPath({ [path.split('.')[0]]: arr }, path) : item, [path]: undefined, ...nestUnwind(path, item) });
        }
      }
      // Simpler unwind for top-level arrays like services:
      const simple = [];
      for (const doc of rows) {
        const arr = getPath(doc, path);
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          const clone = { ...doc };
          setPath(clone, path, item);
          simple.push(clone);
        }
      }
      rows = simple;
      continue;
    }

    if (stage.$group) {
      const { _id: idExpr, ...accumulators } = stage.$group;
      const buckets = new Map();

      for (const doc of rows) {
        const key = groupKey(idExpr, doc);
        if (!buckets.has(key)) {
          const init = { _id: parseGroupKey(idExpr, key), __avg: {} };
          for (const [field, expr] of Object.entries(accumulators)) {
            const op = Object.keys(expr)[0];
            if (op === '$avg') {
              init[field] = 0;
              init.__avg[field] = { sum: 0, n: 0, expr: expr.$avg };
            } else if (op === '$sum') {
              init[field] = 0;
            } else {
              init[field] = null;
            }
            init[`__op_${field}`] = op;
            init[`__expr_${field}`] = expr[op];
          }
          buckets.set(key, init);
        }

        const bucket = buckets.get(key);
        for (const [field, expr] of Object.entries(accumulators)) {
          const op = Object.keys(expr)[0];
          if (op === '$avg') {
            const v = Number(resolveValue(expr.$avg, doc)) || 0;
            bucket.__avg[field].sum += v;
            bucket.__avg[field].n += 1;
            bucket[field] = bucket.__avg[field].sum / bucket.__avg[field].n;
          } else {
            bucket[field] = evalAccumulate(op, bucket[field], doc, expr[op]);
          }
        }
      }

      rows = [...buckets.values()].map((b) => {
        const clean = { _id: b._id };
        for (const field of Object.keys(accumulators)) {
          clean[field] = b[field];
        }
        return clean;
      });
      continue;
    }

    if (stage.$sort) {
      const entries = Object.entries(stage.$sort);
      rows.sort((a, b) => {
        for (const [field, dir] of entries) {
          const av = getPath(a, field);
          const bv = getPath(b, field);
          if (av === bv) continue;
          if (av == null) return 1;
          if (bv == null) return -1;
          const cmp = av > bv ? 1 : -1;
          return dir === -1 || dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
      continue;
    }

    if (stage.$limit != null) {
      rows = rows.slice(0, Number(stage.$limit));
      continue;
    }

    if (stage.$skip != null) {
      rows = rows.slice(Number(stage.$skip));
      continue;
    }

    if (stage.$project) {
      rows = rows.map((doc) => {
        const out = {};
        for (const [k, v] of Object.entries(stage.$project)) {
          if (v === 0 || v === false) continue;
          if (v === 1 || v === true) out[k] = getPath(doc, k);
          else out[k] = resolveValue(v, doc);
        }
        return out;
      });
    }
  }

  return rows;
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function nestUnwind() {
  return {};
}
