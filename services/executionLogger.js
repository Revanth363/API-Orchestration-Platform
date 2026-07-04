const ExecutionLog = require('../models/ExecutionLog');
const { STATUS } = require('../constants/status');
const logger = require('../utils/logger');

const executionLogger = {

    async log(context) {
        try {
            const { requestId, apiConfig, originalRequest, stepResults, finalResponse, status, error, startedAt, completedAt } = context;

            const steps = stepResults.map((result, index) => ({
                step: index + 1,
                vendor: result.vendorId,
                status: result.status,
                requestPayload: result.requestPayload,
                responsePayload: result.responsePayload,
                retryAttempts: result.retryAttempts || 0,
                startedAt: result.startedAt,
                completedAt: result.completedAt,
                duration: result.completedAt - result.startedAt,
                error: result.error || null
            }));

            const totalDuration = completedAt - startedAt;

            await ExecutionLog.create({
                requestId,
                apiConfigId: apiConfig._id,
                endpoint: apiConfig.endpoint,
                method: apiConfig.method,
                status,
                originalRequest,
                finalResponse: finalResponse || {},
                steps,
                startedAt,
                completedAt,
                totalDuration,
                error: error || null
            });

            logger.info(`execution log saved for requestId: ${requestId}`);

        } catch (err) {
            // logging should never crash the main flow
            logger.error(`failed to save execution log: ${err.message}`);
        }
    },

    async getByRequestId(requestId) {
        try {
            return await ExecutionLog
                .findOne({ requestId })
                .populate('apiConfigId', 'name endpoint method')
                .populate('steps.vendor', 'name baseUrl');
        } catch (err) {
            logger.error(`failed to fetch execution log: ${err.message}`);
            return null;
        }
    },

    async getByEndpoint(endpoint, limit = 20) {
        try {
            return await ExecutionLog
                .find({ endpoint })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('apiConfigId', 'name endpoint method')
                .select('-originalRequest -finalResponse -steps');
        } catch (err) {
            logger.error(`failed to fetch execution logs: ${err.message}`);
            return [];
        }
    }
};

module.exports = executionLogger;