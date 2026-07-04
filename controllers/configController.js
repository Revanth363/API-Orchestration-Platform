const ApiConfig = require('../models/ApiConfig');
const configLoader = require('../services/configLoader');
const responseBuilder = require('../utils/responseBuilder');
const logger = require('../utils/logger');

const configController = {

    async create(req, res, next) {
        try {
            const config = await ApiConfig.create(req.body);
            logger.info(`api config created: ${config.name}`);
            return responseBuilder.success(res, config, 'api config created successfully', 201);
        } catch (error) {
            next(error);
        }
    },

    async getAll(req, res, next) {
        try {
            const configs = await ApiConfig
                .find({ isActive: true })
                .populate('workflow.vendor', 'name baseUrl endpoint method')
                .sort({ createdAt: -1 });
            return responseBuilder.success(res, configs, 'api configs fetched successfully');
        } catch (error) {
            next(error);
        }
    },

    async getById(req, res, next) {
        try {
            const config = await ApiConfig
                .findById(req.params.id)
                .populate('workflow.vendor');

            if (!config) {
                return responseBuilder.error(res, 'api config not found', 404);
            }

            return responseBuilder.success(res, config, 'api config fetched successfully');
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const config = await ApiConfig
                .findByIdAndUpdate(
                    req.params.id,
                    req.body,
                    { new: true, runValidators: true }
                )
                .populate('workflow.vendor');

            if (!config) {
                return responseBuilder.error(res, 'api config not found', 404);
            }

            // invalidate cache so next request gets fresh config
            configLoader.invalidate(config.endpoint, config.method);
            logger.info(`api config updated: ${config.name}`);

            return responseBuilder.success(res, config, 'api config updated successfully');
        } catch (error) {
            next(error);
        }
    },

    // soft delete - keeps execution history intact and allows easy restore
    async delete(req, res, next) {
        try {
            const config = await ApiConfig.findByIdAndUpdate(
                req.params.id,
                { isActive: false },
                { new: true }
            );

            if (!config) {
                return responseBuilder.error(res, 'api config not found', 404);
            }

            // invalidate cache so this config stops being served
            configLoader.invalidate(config.endpoint, config.method);
            logger.info(`api config deactivated: ${config.name}`);

            return responseBuilder.success(res, null, 'api config deactivated successfully');
        } catch (error) {
            next(error);
        }
    }
};

module.exports = configController;