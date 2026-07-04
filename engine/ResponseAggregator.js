const logger = require('../utils/logger');

const responseAggregator = {

    aggregate(stepResults) {
        if (!stepResults || stepResults.length === 0) {
            return {};
        }

        // single step - just return its mapped response directly
        if (stepResults.length === 1) {
            return stepResults[0].mappedResponse || {};
        }

        // multi step - combine all step results into one response
        const aggregated = {};

        for (const result of stepResults) {
            if (result.status === 'SUCCESS' && result.mappedResponse) {
                // merge each step's mapped response into final result
                // later steps overwrite earlier ones if keys clash
                Object.assign(aggregated, result.mappedResponse);
            }
        }

        logger.info(`aggregated ${stepResults.length} step results into final response`);

        return aggregated;
    },

    // builds a detailed response showing each step's contribution
    // useful for debugging multi-step workflows
    aggregateWithStepDetail(stepResults) {
        const summary = {
            steps: [],
            final: {}
        };

        for (const result of stepResults) {
            summary.steps.push({
                step: result.step,
                vendor: result.vendorName,
                status: result.status,
                response: result.mappedResponse || {}
            });

            if (result.status === 'SUCCESS' && result.mappedResponse) {
                Object.assign(summary.final, result.mappedResponse);
            }
        }

        return summary;
    }
};

module.exports = responseAggregator;