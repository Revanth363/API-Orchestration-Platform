const logger = require('../utils/logger');

// supported operators
const operators = {
    eq: (a, b) => a == b,
    neq: (a, b) => a != b,
    gt: (a, b) => Number(a) > Number(b),
    lt: (a, b) => Number(a) < Number(b),
    exists: (a) => a !== undefined && a !== null && a !== '',
    contains: (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase())
};

const conditionChecker = {

    // checks whether the next step should run
    shouldExecute(condition, context) {
        // no condition means always run
        if (!condition || !condition.field) {
            return true;
        }

        const { field, operator, value } = condition;

        // dig into context.currentData to find the field value
        const actualValue = context.currentData[field];

        if (!operators[operator]) {
            logger.warn(`unknown operator '${operator}' — skipping condition, step will run`);
            return true;
        }

        const result = operators[operator](actualValue, value);

        logger.info(
            `condition check: ${field} ${operator} ${value} | actual: ${actualValue} | result: ${result}`
        );

        return result;
    }
};

module.exports = conditionChecker;