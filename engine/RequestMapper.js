const logger = require('../utils/logger');

const requestMapper = {

    map(data, mapping) {
        if (!mapping) {
            return { ...data };
        }

        // handle both mongoose Map and plain object
        const entries = mapping instanceof Map
            ? [...mapping.entries()]
            : Object.entries(mapping);

        if (entries.length === 0) {
            return { ...data };
        }

        const mapped = {};

        for (const [clientField, vendorField] of entries) {
            if (data[clientField] !== undefined) {
                mapped[vendorField] = data[clientField];
            } else {
                logger.warn(`request mapping: field '${clientField}' not found in request data`);
            }
        }

        logger.info(`request mapped: ${JSON.stringify(data)} -> ${JSON.stringify(mapped)}`);

        return mapped;
    }
};

module.exports = requestMapper;