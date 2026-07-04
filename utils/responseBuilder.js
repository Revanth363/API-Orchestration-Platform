const { STATUS } = require('../constants/status');

const responseBuilder = {
    success(res, data = {}, message = 'success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            status: STATUS.SUCCESS,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    },

    error(res, message = 'something went wrong', statusCode = 500, errors = null) {
        const response = {
            success: false,
            status: STATUS.FAILED,
            message,
            timestamp: new Date().toISOString()
        };

        if (errors) {
            response.errors = errors;
        }

        return res.status(statusCode).json(response);
    },

    validationError(res, errors) {
        return res.status(400).json({
            success: false,
            status: STATUS.VALIDATION_FAILED,
            message: 'validation failed',
            errors,
            timestamp: new Date().toISOString()
        });
    }
};

module.exports = responseBuilder;