const ApiConfig = require('../models/ApiConfig');
const logger = require('../utils/logger');

// simple in-memory cache
// key: endpoint+method, value: { config, cachedAt }
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

const configLoader = {

    async load(endpoint, method) {
        const cacheKey = `${method}:${endpoint}`;

        // check cache first
        const cached = cache.get(cacheKey);
        if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
            logger.info(`config cache hit for ${cacheKey}`);
            return cached.config;
        }

        // load from mongodb
        const config = await ApiConfig
            .findOne({ endpoint, method: method.toUpperCase(), isActive: true })
            .populate('workflow.vendor');

        if (!config) {
            logger.warn(`no active config found for ${method} ${endpoint}`);
            return null;
        }

        // store in cache
        cache.set(cacheKey, { config, cachedAt: Date.now() });
        logger.info(`config loaded and cached for ${cacheKey}`);

        return config;
    },

    // call this when a config is updated so cache doesnt serve stale data
    invalidate(endpoint, method) {
        const cacheKey = `${method}:${endpoint}`;
        cache.delete(cacheKey);
        logger.info(`cache invalidated for ${cacheKey}`);
    },

    // clear everything - useful during testing
    clearAll() {
        cache.clear();
        logger.info('config cache cleared');
    }
};

module.exports = configLoader;