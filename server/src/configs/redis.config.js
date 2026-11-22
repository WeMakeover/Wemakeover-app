import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    })
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      // Connection options for better error handling
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      // lazyConnect: true, // Don't connect immediately
      // Optional: Enable TLS if Redis server requires it
      // tls: {},
    });

// Handle Redis connection errors gracefully
redis.on('error', (error) => {
  console.warn('Redis connection error:', error.message);
  console.warn('Redis functionality will be limited. Application will continue without Redis.');
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

// Don't throw errors on Redis failures
redis.on('ready', () => {
  console.log('Redis is ready');
});

export default redis;