const ApiConfig = require('../models/ApiConfig');
const Vendor = require('../models/Vendor');
const configGenerator = require('../agents/ConfigGenerator');
const responseBuilder = require('../utils/responseBuilder');
const logger = require('../utils/logger');

const PROJECT_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE']);
const SUPPORTED_ON_FAILURE = new Set(['STOP', 'CONTINUE', 'SKIP']);

const normalizeMappings = (mapping) => {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
        return {};
    }

    return Object.fromEntries(Object.entries(mapping));
};

const resolveVendorIds = async (workflow) => {
    const resolvedSteps = [];

    for (const step of workflow) {
        const vendorName = step.vendor;
        const vendor = await Vendor.findOne({ name: vendorName, isActive: true });

        if (!vendor) {
            throw new Error(`vendor not found: ${vendorName}`);
        }

        const vendorResponseSchema = vendor.responseSchema instanceof Map
            ? Object.fromEntries(vendor.responseSchema)
            : (vendor.responseSchema || {});

        const responseMappingKeys = Object.keys(normalizeMappings(step.responseMapping));
        const invalidResponseFields = responseMappingKeys.filter(
            (field) => !Object.prototype.hasOwnProperty.call(vendorResponseSchema, field)
        );

        if (invalidResponseFields.length > 0) {
            throw new Error(
                `workflow step ${step.step} uses unknown response fields for ${vendorName}: ${invalidResponseFields.join(', ')}`
            );
        }

        resolvedSteps.push({
            step: Number(step.step),
            vendor: vendor._id,
            requestMapping: normalizeMappings(step.requestMapping),
            responseMapping: normalizeMappings(step.responseMapping),
            condition: step.condition || { field: null, operator: null, value: null },
            parallel: Boolean(step.parallel),
            onFailure: SUPPORTED_ON_FAILURE.has(step.onFailure) ? step.onFailure : 'STOP'
        });
    }

    return resolvedSteps.sort((left, right) => left.step - right.step);
};

const normalizeValidation = (validation) => {
    if (!Array.isArray(validation)) {
        return [];
    }

    return validation.map((rule) => ({
        field: rule.field,
        required: Boolean(rule.required),
        type: rule.type || 'string',
        regex: rule.regex ?? null,
        message: rule.message ?? null
    }));
};

const buildApiConfig = async (generatedConfig) => {
    const method = String(generatedConfig.method || '').toUpperCase();

    if (!PROJECT_METHODS.has(method)) {
        throw new Error(`invalid HTTP method generated: ${generatedConfig.method}`);
    }

    const workflow = await resolveVendorIds(generatedConfig.workflow);

    return {
        name: generatedConfig.name,
        description: generatedConfig.description || '',
        endpoint: generatedConfig.endpoint,
        method,
        version: generatedConfig.version || 'v1',
        validation: normalizeValidation(generatedConfig.validation),
        workflow,
        isActive: true
    };
};

const agentController = {
    async generateConfig(req, res, next) {
        try {
            const { prompt } = req.body || {};

            if (!prompt || !String(prompt).trim()) {
                return responseBuilder.error(res, 'prompt is required', 400);
            }

            const generatedConfig = await configGenerator.generate(String(prompt));

            if (generatedConfig.error) {
                return responseBuilder.error(res, generatedConfig.error, 422);
            }

            const duplicateConfig = await ApiConfig.findOne({ endpoint: generatedConfig.endpoint });

            if (duplicateConfig) {
                return responseBuilder.error(res, 'endpoint already exists', 409);
            }

            const apiConfigPayload = await buildApiConfig(generatedConfig);
            const createdConfig = await ApiConfig.create(apiConfigPayload);
            const populatedConfig = await createdConfig.populate('workflow.vendor');

            logger.info(`agent generated api config: ${populatedConfig.name}`);

            return responseBuilder.success(
                res,
                populatedConfig,
                'Workflow generated successfully',
                201
            );
        } catch (error) {
            next(error);
        }
    }
};

module.exports = agentController;