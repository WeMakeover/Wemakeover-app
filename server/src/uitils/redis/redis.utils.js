import redis from '../../configs/redis.config.js';

/** In-memory OTP/cache when Redis is down (local dev only). */
const memoryCache = new Map();

const isDev = process.env.NODE_ENV !== 'production';

function memorySet(key, value, ttlInSeconds) {
  memoryCache.set(key, {
    value,
    expiresAt: ttlInSeconds ? Date.now() + ttlInSeconds * 1000 : null,
  });
}

function memoryGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function memoryDelete(key) {
  return memoryCache.delete(key);
}

async function useRedis(command) {
  if (redis.status !== 'ready') {
    throw new Error('Redis is not connected');
  }
  return command();
}

export const setCache = async (key, value, ttlInSeconds) => {
  try {
    const stringValue = JSON.stringify(value);
    await useRedis(() =>
      ttlInSeconds
        ? redis.set(key, stringValue, 'EX', ttlInSeconds)
        : redis.set(key, stringValue)
    );
  } catch (error) {
    if (isDev) {
      console.warn(
        `Redis unavailable; storing "${key}" in memory for dev (OTP flows).`
      );
      memorySet(key, value, ttlInSeconds);
      return;
    }
    console.error(`Error setting cache for key "${key}":`, error);
    throw new Error(error.message);
  }
};

export const getCache = async (key) => {
  try {
    const data = await useRedis(() => redis.get(key));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    if (isDev) {
      return memoryGet(key);
    }
    console.error(`Error getting cache for key "${key}":`, error);
    return null;
  }
};

export const deleteCache = async (key) => {
  let deleted = memoryDelete(key);
  try {
    const deletedCount = await useRedis(() => redis.del(key));
    deleted = deleted || deletedCount === 1;
  } catch (error) {
    if (!isDev) {
      console.error(`Error deleting cache for key "${key}":`, error);
    }
  }
  return deleted;
};
