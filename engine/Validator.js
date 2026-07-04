const logger = require('../utils/logger');

// supported validation types
const typeValidators = {
    string: (value) => typeof value === 'string',
    number: (value) => !Number.isNaN(Number(value)),
    boolean: (value) => value === true || value === false || value === 'true' || value === 'false',
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    custom: () => true // custom types rely on regex only
};

const validator = {

    validate(data, rules) {
        const errors = [];

        if (!rules || rules.length === 0) {
            return { valid: true, errors: [] };
        }

        for (const rule of rules) {
            const { field, required, type, regex, message } = rule;
            const value = data[field];

            // required check
            if (required && (value === undefined || value === null || value === '')) {
                errors.push({
                    field,
                    message: message || `${field} is required`
                });
                continue;
            }

            // skip further checks if field is not present and not required
            if (value === undefined || value === null || value === '') {
                continue;
            }

            // type check
            if (type && typeValidators[type]) {
                const isValidType = typeValidators[type](value);
                if (!isValidType) {
                    errors.push({
                        field,
                        message: message || `${field} must be a valid ${type}`
                    });
                    continue;
                }
            }

            // regex check
            if (regex) {
                const pattern = new RegExp(regex);
                if (!pattern.test(String(value))) {
                    errors.push({
                        field,
                        message: message || `${field} format is invalid`
                    });
                }
            }
        }

        if (errors.length > 0) {
            logger.warn(`validation failed: ${JSON.stringify(errors)}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

module.exports = validator;