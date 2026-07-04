const logger = require('../utils/logger');

const responseMapper = {

    map(data, mapping) {
        // if no mapping defined just pass data as is
        if (!mapping || mapping.size === 0) {
            return { ...data };
        }

        const mapped = {};

        for (const [vendorField, clientField] of mapping) {
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