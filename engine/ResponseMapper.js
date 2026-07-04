const logger = require('../utils/logger');

const responseMapper = {

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

        for (const [vendorField, clientField] of entries) {
            if (data[vendorField] !== undefined) {
                mapped[clientField] = data[vendorField];
            } else {
                logger.warn(`response mapping: field '${vendorField}' not found in vendor response`);
            }
        }

        logger.info(`response mapped: ${JSON.stringify(data)} -> ${JSON.stringify(mapped)}`);

        return mapped;
    }
};

module.exports = responseMapper;