const validator = require('./Validator');
const requestMapper = require('./RequestMapper');
const responseMapper = require('./ResponseMapper');
const conditionChecker = require('./ConditionChecker');
const vendorCaller = require('./VendorCaller');
const responseAggregator = require('./ResponseAggregator');
const { STATUS } = require('../constants/status');
const logger = require('../utils/logger');

class WorkflowEngine {

    async execute(apiConfig, requestData, requestId) {
        logger.info(`workflow started | requestId: ${requestId} | endpoint: ${apiConfig.endpoint}`);

        // build execution context
        // this flows through every step and holds everything
        const context = {
            requestId,
            apiConfig,
            originalRequest: requestData,
            currentData: { ...requestData },
            stepResults: [],
            finalResponse: null,
            status: STATUS.PENDING,
            error: null,
            startedAt: new Date(),
            completedAt: null
        };

        try {
            // step 1 - validate incoming request once before workflow starts
            const { valid, errors } = validator.validate(requestData, apiConfig.validation);
            if (!valid) {
                context.status = STATUS.VALIDATION_FAILED;
                context.error = 'request validation failed';
                context.completedAt = new Date();
                return { success: false, validationErrors: errors, context };
            }

            // step 2 - execute workflow steps in order
            for (const step of apiConfig.workflow) {
                const stepResult = await this.executeStep(step, context);
                context.stepResults.push(stepResult);

                // update currentData with this step's response
                // so next step can use it for conditions and mapping
                if (stepResult.status === STATUS.SUCCESS && stepResult.mappedResponse) {
                    context.currentData = {
                        ...context.currentData,
                        ...stepResult.mappedResponse
                    };
                }

                // check if workflow should stop
                if (stepResult.status === STATUS.FAILED) {
                    const onFailure = step.onFailure || 'STOP';

                    if (onFailure === 'STOP') {
                        logger.warn(`step ${step.step} failed with onFailure=STOP | stopping workflow | requestId: ${requestId}`);
                        context.status = STATUS.FAILED;
                        context.error = stepResult.error;
                        context.completedAt = new Date();
                        context.finalResponse = responseAggregator.aggregate(context.stepResults);
                        return { success: false, context };
                    }

                    if (onFailure === 'SKIP') {
                        logger.warn(`step ${step.step} failed with onFailure=SKIP | continuing to next step | requestId: ${requestId}`);
                        continue;
                    }

                    // onFailure === CONTINUE just moves to next step
                    logger.warn(`step ${step.step} failed with onFailure=CONTINUE | continuing workflow | requestId: ${requestId}`);
                }
            }

            // step 3 - aggregate all step responses into final response
            context.finalResponse = responseAggregator.aggregate(context.stepResults);
            context.status = STATUS.SUCCESS;
            context.completedAt = new Date();

            logger.info(`workflow completed | requestId: ${requestId} | duration: ${context.completedAt - context.startedAt}ms`);

            return { success: true, context };

        } catch (error) {
            context.status = STATUS.FAILED;
            context.error = error.message;
            context.completedAt = new Date();

            logger.error(`workflow crashed | requestId: ${requestId} | error: ${error.message}`);

            return { success: false, context };
        }
    }

    // note: currently validates the original client request once before the workflow starts
    // in a production system, each step could define its own input validation rules
    // that would run against context.currentData before that step executes

    async executeStep(step, context) {
        const vendor = step.vendor;
        const stepResult = {
            step: step.step,
            vendorId: vendor._id,
            vendorName: vendor.name,
            status: STATUS.PENDING,
            requestPayload: null,
            responsePayload: null,
            mappedResponse: null,
            retryAttempts: 0,
            startedAt: new Date(),
            completedAt: null,
            error: null
        };

        try {
            // check condition - should this step run?
            const shouldRun = conditionChecker.shouldExecute(step.condition, context);
            if (!shouldRun) {
                logger.info(`step ${step.step} skipped due to condition | requestId: ${context.requestId}`);
                stepResult.status = STATUS.SKIPPED;
                stepResult.completedAt = new Date();
                return stepResult;
            }

            // map request fields - client format -> vendor format
            const mappedRequest = requestMapper.map(context.currentData, step.requestMapping);
            stepResult.requestPayload = mappedRequest;

            // call vendor with retry logic built in
            const vendorResponse = await vendorCaller.call(vendor, mappedRequest);
            stepResult.retryAttempts = vendorResponse.retryAttempts;
            stepResult.startedAt = vendorResponse.startedAt;
            stepResult.completedAt = vendorResponse.completedAt;
            stepResult.responsePayload = vendorResponse.data;

            if (!vendorResponse.success) {
                stepResult.status = STATUS.FAILED;
                stepResult.error = vendorResponse.error;
                return stepResult;
            }

            // map response fields - vendor format -> client format
            const mappedResponse = responseMapper.map(vendorResponse.data, step.responseMapping);
            stepResult.mappedResponse = mappedResponse;
            stepResult.status = STATUS.SUCCESS;

            logger.info(`step ${step.step} completed successfully | vendor: ${vendor.name} | requestId: ${context.requestId}`);

            return stepResult;

        } catch (error) {
            stepResult.status = STATUS.FAILED;
            stepResult.error = error.message;
            stepResult.completedAt = new Date();

            logger.error(`step ${step.step} threw an error | vendor: ${vendor.name} | error: ${error.message}`);

            return stepResult;
        }
    }
}

module.exports = new WorkflowEngine();