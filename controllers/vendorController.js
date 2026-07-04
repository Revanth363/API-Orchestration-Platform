const Vendor = require('../models/Vendor');
const responseBuilder = require('../utils/responseBuilder');
const logger = require('../utils/logger');

const vendorController = {

    async create(req, res, next) {
        try {
            const vendor = await Vendor.create(req.body);
            logger.info(`vendor created: ${vendor.name}`);
            return responseBuilder.success(res, vendor, 'vendor created successfully', 201);
        } catch (error) {
            next(error);
        }
    },

    async getAll(req, res, next) {
        try {
            const vendors = await Vendor
                .find({ isActive: true })
                .sort({ createdAt: -1 });
            return responseBuilder.success(res, vendors, 'vendors fetched successfully');
        } catch (error) {
            next(error);
        }
    },

    async getById(req, res, next) {
        try {
            const vendor = await Vendor.findById(req.params.id);

            if (!vendor) {
                return responseBuilder.error(res, 'vendor not found', 404);
            }

            return responseBuilder.success(res, vendor, 'vendor fetched successfully');
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const vendor = await Vendor.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );

            if (!vendor) {
                return responseBuilder.error(res, 'vendor not found', 404);
            }

            logger.info(`vendor updated: ${vendor.name}`);
            return responseBuilder.success(res, vendor, 'vendor updated successfully');
        } catch (error) {
            next(error);
        }
    },

    // soft delete - same pattern as configController
    async delete(req, res, next) {
        try {
            const vendor = await Vendor.findByIdAndUpdate(
                req.params.id,
                { isActive: false },
                { new: true }
            );

            if (!vendor) {
                return responseBuilder.error(res, 'vendor not found', 404);
            }

            logger.info(`vendor deactivated: ${vendor.name}`);
            return responseBuilder.success(res, null, 'vendor deactivated successfully');
        } catch (error) {
            next(error);
        }
    }
};

module.exports = vendorController;