const ApiConfig = require('../models/ApiConfig');
const logger = require('../utils/logger');
const redisClient = require('./redisClient');

const cache = new Map();
const CACHE_TTL = Number(process.env.CONFIG_CACHE_TTL_MS || 60 * 1000);
const REDIS_CACHE_KEY_PREFIX = 'api-config:';

const buildCacheKey = (endpoint, method) => `${method.toUpperCase()}:${endpoint}`;

const buildRedisKey = (cacheKey) => `${REDIS_CACHE_KEY_PREFIX}${cacheKey}`;

const normalizeMappings = (config) => {
    if (!config.workflow) return config;

    config.workflow = config.workflow.map(step => ({
        ...step,
        requestMapping: step.requestMapping instanceof Map
            ? Object.fromEntries(step.requestMapping)
            : (step.requestMapping || {}),
        responseMapping: step.responseMapping instanceof Map
            ? Object.fromEntries(step.responseMapping)
            : (step.responseMapping || {})
    }));

    return config;
};

const readRedisCache = async (cacheKey) => {
    const cachedValue = await redisClient.get(buildRedisKey(cacheKey));

    if (!cachedValue) {
        return null;
    }

    try {
        return JSON.parse(cachedValue);
    } catch (error) {
        logger.warn(`failed to parse redis cache for ${cacheKey}: ${error.message}`);
        return null;
    }
};

const configLoader = {

    async load(endpoint, method) {
        const cacheKey = buildCacheKey(endpoint, method);

        // check in-memory cache first
        const cached = cache.get(cacheKey);
        if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
            logger.info(`config cache hit for ${cacheKey}`);
            return cached.config;
        }

        // check redis cache second
        const redisCachedConfig = await readRedisCache(cacheKey);
        if (redisCachedConfig) {
            cache.set(cacheKey, { config: redisCachedConfig, cachedAt: Date.now() });
            logger.info(`config redis cache hit for ${cacheKey}`);
            return redisCachedConfig;
        }

        // load from mongodb
        const config = await ApiConfig
            .findOne({ endpoint, method: method.toUpperCase(), isActive: true })
            .populate('workflow.vendor');

        if (!config) {
            logger.warn(`no active config found for ${method} ${endpoint}`);
            return null;
        }

        // convert to plain object and normalize all mappings
        // handles both seeded configs (Mongoose Maps) and
        // AI generated configs (plain objects) consistently
        const cachedConfig = normalizeMappings(config.toObject());

        // store in memory cache
        cache.set(cacheKey, { config: cachedConfig, cachedAt: Date.now() });

        // store in redis cache
        await redisClient.set(
            buildRedisKey(cacheKey),
            JSON.stringify(cachedConfig),
            Math.ceil(CACHE_TTL / 1000)
        );

        logger.info(`config loaded and cached for ${cacheKey}`);

        return cachedConfig;
    },

    async invalidate(endpoint, method) {
        const cacheKey = buildCacheKey(endpoint, method);
        cache.delete(cacheKey);
        await redisClient.del(buildRedisKey(cacheKey));
        logger.info(`cache invalidated for ${cacheKey}`);
    },

    async clearAll() {
        cache.clear();
        await redisClient.clear(`${REDIS_CACHE_KEY_PREFIX}*`);
        logger.info('config cache cleared');
    }
};

module.exports = configLoader;