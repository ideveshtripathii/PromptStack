import { createClient } from 'redis';

const KEY_PREFIX = 'promptstack:';

// In-memory mock replacing actual Redis for seamless local development
class DummyRedisClient {
    constructor() {
        this.cache = new Map();
    }
    async get(key) {
        return this.cache.get(KEY_PREFIX + key) || null;
    }
    async setEx(key, seconds, value) {
        this.cache.set(KEY_PREFIX + key, value);
        // Clean up memory after TTL to prevent memory leaks
        setTimeout(() => this.cache.delete(KEY_PREFIX + key), seconds * 1000);
    }
    async del(key) {
        this.cache.delete(KEY_PREFIX + key);
    }
    on(event, cb) {
        if (event === 'connect') {
            cb();
        }
    }
    async connect() {
        console.log('In-Memory Redis Mock Client Connected (Fallback)');
    }
}

// Wrapper to automatically prefix all Redis keys for isolation
class PrefixedRedisClient {
    constructor(client) {
        this.client = client;
    }
    async get(key) {
        return this.client.get(KEY_PREFIX + key);
    }
    async setEx(key, seconds, value) {
        return this.client.setEx(KEY_PREFIX + key, seconds, value);
    }
    async del(key) {
        return this.client.del(KEY_PREFIX + key);
    }
    on(event, cb) {
        return this.client.on(event, cb);
    }
    async connect() {
        return this.client.connect();
    }
}

let redisClient;

if (process.env.REDIS_URL) {
    const client = createClient({
        url: process.env.REDIS_URL,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries >= 1) {
                    return new Error('Redis connection failed');
                }
                return 500;
            }
        }
    });

    client.on('error', (err) => {
        console.error('Redis Client Error:', err.message);
    });

    try {
        await client.connect();
        console.log('Redis Client Connected');
        redisClient = new PrefixedRedisClient(client);
    } catch (err) {
        console.warn('Failed to connect to Redis. Falling back to In-Memory Redis Mock.');
        const dummy = new DummyRedisClient();
        await dummy.connect();
        redisClient = dummy;
    }
} else {
    redisClient = new DummyRedisClient();
    await redisClient.connect();
}

export default redisClient;


