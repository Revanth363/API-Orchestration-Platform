const logger = require('../utils/logger');

const requestMapper = {

    map(data, mapping) {
        // if no mapping defined just pass data as is
        if (!mapping || mapping.size === 0) {
            return { ...data };
        }

        const mapped = {};

        for (const [clientField, vendorField] of mapping) {
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