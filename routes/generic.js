const express = require('express');
const router = express.Router();
const configLoader = require('../services/configLoader');
const workflowEngine = require('../engine/WorkflowEngine');
const executionLogger = require('../services/executionLogger');
const responseBuilder = require('../utils/responseBuilder');
const generateRequestId = require('../utils/requestId');
const { STATUS } = require('../constants/status');
const logger = require('../utils/logger');

// this single route handler handles every configured endpoint dynamically
// no new routes needed when a new API config is added to the database
router.use(async (req, res, next) => {
    const requestId = generateRequestId();
    const endpoint = req.path;
    const method = req.method;

    logger.info(`incoming request | requestId: ${requestId} | ${method} ${endpoint}`);

    try {
        // load config from mongodb (or cache)
        const apiConfig = await configLoader.load(endpoint, method);

        if (!apiConfig) {
            return responseBuilder.error(
                res,
                `no configuration found for ${method} ${endpoint}`,
                404
            );
        }

        // hand off to workflow engine
        let requestData = {};

        if (method === 'GET' || method === 'DELETE') {
            requestData = { ...req.query };
        } else {
            // POST, PUT - body is the source of truth
            // still merge query params but body wins on key collision
            requestData = { ...req.query, ...req.body };
        }
        // note: requestData is validated inside workflowEngine against apiConfig.validation rules
        // query params are merged but body always wins on key collision for POST/PUT
        const { success, context, validationErrors } = await workflowEngine.execute(
            apiConfig,
            requestData,
            requestId
        );

        // save execution log regardless of success or failure
        await executionLogger.log(context);

        // handle validation failure
        if (context.status === STATUS.VALIDATION_FAILED) {
            return responseBuilder.validationError(res, validationErrors);
        }

        // handle workflow failure
        if (!success) {
            return responseBuilder.error(
                res,
                context.error || 'workflow execution failed',
                500
            );
        }

        // all good - return final response
        return responseBuilder.success(
            res,
            context.finalResponse,
            'workflow executed successfully'
        );

    } catch (error) {
        logger.error(`generic route error | requestId: ${requestId} | ${error.message}`);
        next(error);
    }
});

module.exports = router;