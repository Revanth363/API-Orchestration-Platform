const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../utils/logger');

// apply retry logic to axios globally
axiosRetry(axios, {
    retries: 0, // we handle retries per vendor config
    retryCondition: (error) => {
        return (
            axiosRetry.isNetworkError(error) ||
            axiosRetry.isRetryableError(error) ||
            error.response?.status === 503
        );
    }
});

const vendorCaller = {

    async call(vendor, payload) {
        const url = `${vendor.baseUrl}${vendor.endpoint}`;
        const maxRetries = vendor.retry?.count ?? 3;
        const retryDelay = vendor.retry?.delay ?? 1000;

        // build headers
        const headers = {
            'Content-Type': 'application/json',
            ...Object.fromEntries(vendor.headers || [])
        };

        // attach authentication
        if (vendor.authentication?.type === 'BEARER') {
            headers['Authorization'] = `Bearer ${vendor.authentication.value}`;
        } else if (vendor.authentication?.type === 'API_KEY') {
            headers['x-api-key'] = vendor.authentication.value;
        }

        let attempt = 0;
        let lastError = null;

        while (attempt <= maxRetries) {
            const startedAt = new Date();

            try {
                logger.info(`calling vendor: ${vendor.name} | attempt: ${attempt + 1} | url: ${url}`);

                const response = await axios({
                    method: vendor.method,
                    url,
                    data: payload,
                    headers,
                    timeout: vendor.timeout || 5000
                });

                const completedAt = new Date();
                const duration = completedAt - startedAt;

                logger.info(`vendor ${vendor.name} responded in ${duration}ms`);

                return {
                    success: true,
                    data: response.data,
                    status: response.status,
                    retryAttempts: attempt,
                    startedAt,
                    completedAt
                };

            } catch (error) {
                lastError = error;
                const completedAt = new Date();
                const statusCode = error.response?.status;

                logger.warn(
                    `vendor ${vendor.name} failed | attempt: ${attempt + 1} | status: ${statusCode} | error: ${error.message}`
                );

                // dont retry on client errors (4xx) - retrying wont help
                if (statusCode >= 400 && statusCode < 500) {
                    logger.warn(`vendor ${vendor.name} returned ${statusCode} - not retrying`);
                    break;
                }

                // if we still have retries left, wait before trying again
                if (attempt < maxRetries) {
                    logger.info(`retrying vendor ${vendor.name} in ${retryDelay}ms...`);
                    await this.sleep(retryDelay);
                }

                attempt++;
            }
        }

        // all retries exhausted
        const completedAt = new Date();
        logger.error(`vendor ${vendor.name} failed after ${attempt} attempt(s): ${lastError.message}`);

        return {
            success: false,
            data: lastError.response?.data || null,
            status: lastError.response?.status || 500,
            retryAttempts: attempt,
            startedAt: new Date(),
            completedAt,
            error: lastError.message
        };
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

module.exports = vendorCaller;