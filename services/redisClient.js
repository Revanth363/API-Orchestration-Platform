const { Redis } = require('@upstash/redis');
const { createClient } = require('redis');
const logger = require('../utils/logger');

const upstashUrl = process.env.UPSTASH_REDIS_URL;
const upstashToken = process.env.UPSTASH_REDIS_TOKEN;
const redisUrl = process.env.REDIS_URL;

let client = null;
let connectPromise = null;
let mode = null;

const getClient = () => {
    if (client) {
        return client;
    }

    if (upstashUrl && upstashToken) {
        mode = 'upstash';
        client = new Redis({ url: upstashUrl, token: upstashToken });
        return client;
    }

    if (!redisUrl) {
        return null;
    }

    mode = 'redis';
    client = createClient({ url: redisUrl });

    client.on('error', (error) => {
        logger.warn(`redis client error: ${error.message}`);
    });

    return client;
};

const ensureConnected = async () => {
    const activeClient = getClient();

    if (!activeClient) {
        return null;
    }

    if (mode === 'upstash') {
        return activeClient;
    }

    if (activeClient.isOpen) {
        return activeClient;
    }

    if (!connectPromise) {
        connectPromise = activeClient
            .connect()
            .then(() => {
                logger.info('redis connected');
                return activeClient;
            })
            .catch((error) => {
                logger.warn(`redis connection failed: ${error.message}`);
                return null;
            })
            .finally(() => {
                connectPromise = null;
            });
    }

    return connectPromise;
};

const redisClient = {
    async get(key) {
        const activeClient = await ensureConnected();

        if (!activeClient) {
            return null;
        }

        try {
            if (mode === 'upstash') {
                return await activeClient.get(key);
            }

            return await activeClient.get(key);
        } catch (error) {
            logger.warn(`redis get failed for ${key}: ${error.message}`);
            return null;
        }
    },

    async set(key, value, ttlSeconds) {
        const activeClient = await ensureConnected();

        if (!activeClient) {
            return false;
        }

        try {
            if (mode === 'upstash') {
                if (ttlSeconds) {
                    await activeClient.set(key, value, { ex: ttlSeconds });
                } else {
                    await activeClient.set(key, value);
                }

                return true;
            }

            if (ttlSeconds) {
                await activeClient.set(key, value, { EX: ttlSeconds });
            } else {
                await activeClient.set(key, value);
            }

            return true;
        } catch (error) {
            logger.warn(`redis set failed for ${key}: ${error.message}`);
            return false;
        }
    },

    async del(key) {
        const activeClient = await ensureConnected();

        if (!activeClient) {
            return 0;
        }

        try {
            if (mode === 'upstash') {
                return await activeClient.del(key);
            }

            return await activeClient.del(key);
        } catch (error) {
            logger.warn(`redis delete failed for ${key}: ${error.message}`);
            return 0;
        }
    },

    async clear(pattern) {
        const activeClient = await ensureConnected();

        if (!activeClient) {
            return 0;
        }

        try {
            if (mode === 'upstash') {
                return 0;
            }

            let deleted = 0;

            for await (const key of activeClient.scanIterator({ MATCH: pattern })) {
                deleted += await activeClient.del(key);
            }

            return deleted;
        } catch (error) {
            logger.warn(`redis clear failed for ${pattern}: ${error.message}`);
            return 0;
        }
    }
};

module.exports = redisClient;