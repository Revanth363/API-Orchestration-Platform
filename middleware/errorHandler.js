const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

const errorHandler = (err, req, res, next) => {
    logger.error(`${err.message}`, err);

    // mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return responseBuilder.validationError(res, errors);
    }

    // mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return responseBuilder.error(
            res,
            `${field} already exists`,
            409
        );
    }

    // mongoose bad objectid
    if (err.name === 'CastError') {
        return responseBuilder.error(res, `invalid id format`, 400);
    }

    // default
    return responseBuilder.error(
        res,
        err.message || 'something went wrong',
        err.statusCode || 500
    );
};

module.exports = errorHandler;