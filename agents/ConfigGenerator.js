const { GoogleGenAI } = require('@google/genai');
const Vendor = require('../models/Vendor');
const logger = require('../utils/logger');

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE']);
const SUPPORTED_TYPES = new Set(['string', 'number', 'boolean', 'email', 'custom']);
const SUPPORTED_CONDITION_OPERATORS = new Set(['eq', 'neq', 'gt', 'lt', 'exists', 'contains']);
const SUPPORTED_ON_FAILURE = new Set(['STOP', 'CONTINUE', 'SKIP']);

const buildSchemaHint = () => JSON.stringify(
        {
                name: 'Verify PAN',
                description: 'validates a PAN using VendorA and runs fraud detection if successful',
                endpoint: '/verify-pan',
                method: 'POST',
                version: 'v1',
                validation: [
                        {
                                field: 'pan',
                                required: true,
                                type: 'string',
                                regex: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
                                message: 'pan must be in valid format'
                        }
                ],
                workflow: [
                    {
                        step: 1,
                        vendor: 'VendorA',
                        requestMapping: {
                            pan: 'panNumber',
                            name: 'fullName'
                        },
                        responseMapping: {
                            verificationStatus: 'status'
                        },
                        condition: {
                            field: null,
                            operator: null,
                            value: null
                        },
                        parallel: false,
                        onFailure: 'STOP'
                    },
                    {
                        step: 2,
                        vendor: 'VendorB',
                        requestMapping: {
                            documentId: 'pan'
                        },
                        responseMapping: {
                            result: 'verificationResult'
                        },
                        condition: {
                            field: 'status',
                            operator: 'eq',
                            value: 'VALID'
                        },
                        parallel: false,
                        onFailure: 'CONTINUE'
                    }
                ]
        },
        null,
        2
);

class ConfigGenerator {
    constructor() {
        this.client = null;
    }

    getClient() {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            const error = new Error('GEMINI_API_KEY is not configured');
            error.statusCode = 500;
            throw error;
        }

        if (!this.client) {
            this.client = new GoogleGenAI({ apiKey });
        }

        return this.client;
    }

    formatVendor(vendor) {
    const responseFields = vendor.responseSchema
        ? Object.entries(
            vendor.responseSchema instanceof Map
                ? Object.fromEntries(vendor.responseSchema)
                : vendor.responseSchema
          )
            .map(([field, desc]) => `    - ${field}: ${desc}`)
            .join('\n')
        : '    - (no schema defined)';

    return [
        `${vendor.name}`,
        vendor.description ? `  description: ${vendor.description}` : null,
        vendor.endpoint ? `  endpoint: ${vendor.endpoint}` : null,
        vendor.method ? `  method: ${String(vendor.method).toUpperCase()}` : null,
        vendor.baseUrl ? `  baseUrl: ${vendor.baseUrl}` : null,
        `  response fields:`,
        responseFields
    ].filter(Boolean).join('\n');
}

    async buildSystemPrompt() {
        const activeVendors = await Vendor.find({ isActive: true })
            .select('name description endpoint method baseUrl responseSchema')
            .sort({ name: 1 })
            .lean();

        const vendorSection = activeVendors.length
            ? activeVendors.map((vendor) => this.formatVendor(vendor)).join('\n\n')
            : 'No active vendors are available.';

        return [
            'You are a configuration generator for an API orchestration platform.',
            'Your job is to generate one valid ApiConfig JSON document from the user prompt.',
            'Use only the vendors listed below. Do not invent vendors or fields.',
            '',
            'Available Vendors:',
            '',
            vendorSection,
            '',
            'Rules:',
            '- Use only vendors from the list above.',
            '- workflow steps must be numbered starting from 1.',
            '- condition fields must use values from a previous step response mapping.',
            '- If the user asks for something no available vendor supports, return exactly: {"error":"Unsupported workflow"}',
            '- Do not wrap the response in markdown or add any commentary.',
            '- Return ONLY valid JSON matching this schema exactly:',
            '',
            buildSchemaHint()
        ].join('\n');
    }

    extractJson(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('empty Gemini response');
        }

        const cleaned = text
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '');

        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error('Gemini did not return JSON');
        }

        return cleaned.slice(firstBrace, lastBrace + 1);
    }

    validateConfigShape(config) {
    // only treat as error response if error is the ONLY field
    if (
        config &&
        typeof config === 'object' &&
        !Array.isArray(config) &&
        Object.keys(config).length === 1 &&
        config.error === 'Unsupported workflow'
    ) {
        return config;
    }

    // if error key exists alongside other valid fields
    // gemini sometimes includes error: null in valid responses — just strip it
    if (config.error !== undefined) {
        delete config.error;
    }

        if (config.error) {
            if (config.error !== 'Unsupported workflow') {
                throw new Error(`generated error response is unsupported: ${config.error}`);
            }

            throw new Error('unsupported workflow responses must contain only the error field');
        }

        const requiredTopLevel = ['name', 'description', 'endpoint', 'method', 'version', 'validation', 'workflow'];

        for (const key of requiredTopLevel) {
            if (config[key] === undefined || config[key] === null || config[key] === '') {
                throw new Error(`generated config is missing required field: ${key}`);
            }
        }

        if (!SUPPORTED_METHODS.has(String(config.method).toUpperCase())) {
            throw new Error(`generated config has unsupported method: ${config.method}`);
        }

        config.method = String(config.method).toUpperCase();

        if (!Array.isArray(config.validation)) {
            throw new Error('generated config validation must be an array');
        }

        if (!Array.isArray(config.workflow) || config.workflow.length === 0) {
            throw new Error('generated config workflow must be a non-empty array');
        }

        const seenSteps = new Set();

        for (const rule of config.validation) {
            if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
                throw new Error('each validation rule must be an object');
            }

            if (!rule.field || typeof rule.field !== 'string') {
                throw new Error('each validation rule must include a field');
            }

            if (typeof rule.required !== 'boolean') {
                throw new Error(`validation rule '${rule.field}' must include required as a boolean`);
            }

            if (!SUPPORTED_TYPES.has(rule.type)) {
                throw new Error(`validation rule '${rule.field}' has unsupported type: ${rule.type}`);
            }

            if (rule.regex !== null && rule.regex !== undefined && typeof rule.regex !== 'string') {
                throw new Error(`validation rule '${rule.field}' regex must be a string or null`);
            }

            if (rule.message !== null && rule.message !== undefined && typeof rule.message !== 'string') {
                throw new Error(`validation rule '${rule.field}' message must be a string or null`);
            }
        }

        for (const step of config.workflow) {
            if (!step || typeof step !== 'object' || Array.isArray(step)) {
                throw new Error('each workflow step must be an object');
            }

            if (!Number.isInteger(step.step) || step.step < 1) {
                throw new Error('each workflow step must include a positive integer step number');
            }

            if (seenSteps.has(step.step)) {
                throw new Error(`duplicate workflow step number found: ${step.step}`);
            }

            seenSteps.add(step.step);

            if (!step.vendor || typeof step.vendor !== 'string') {
                throw new Error('each workflow step must include a vendor name');
            }

            if (step.requestMapping === undefined || step.requestMapping === null || typeof step.requestMapping !== 'object' || Array.isArray(step.requestMapping)) {
                throw new Error(`workflow step ${step.step} must include a requestMapping object`);
            }

            if (step.responseMapping === undefined || step.responseMapping === null || typeof step.responseMapping !== 'object' || Array.isArray(step.responseMapping)) {
                throw new Error(`workflow step ${step.step} must include a responseMapping object`);
            }

            if (step.condition !== undefined && step.condition !== null) {
                if (typeof step.condition !== 'object' || Array.isArray(step.condition)) {
                    throw new Error(`workflow step ${step.step} condition must be an object`);
                }

                const { field, operator, value } = step.condition;

                if (field !== null && field !== undefined && typeof field !== 'string') {
                    throw new Error(`workflow step ${step.step} condition field must be a string or null`);
                }

                if (operator !== null && operator !== undefined && !SUPPORTED_CONDITION_OPERATORS.has(operator)) {
                    throw new Error(`workflow step ${step.step} has unsupported condition operator: ${operator}`);
                }

                if (operator === null && (field !== null || value !== null && value !== undefined)) {
                    throw new Error(`workflow step ${step.step} condition must be empty when operator is null`);
                }
            }

            if (typeof step.parallel !== 'boolean') {
                throw new Error(`workflow step ${step.step} parallel must be a boolean`);
            }

            if (!SUPPORTED_ON_FAILURE.has(step.onFailure)) {
                throw new Error(`workflow step ${step.step} has unsupported onFailure value: ${step.onFailure}`);
            }
        }

        return config;
    }

    async generate(prompt) {
        if (!prompt || !prompt.trim()) {
            const error = new Error('prompt is required');
            error.statusCode = 400;
            throw error;
        }

        const response = await this.getClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: await this.buildSystemPrompt(),
                responseMimeType: 'application/json',
                temperature: 0.2
            }
        });
        const rawText = response.text || '';
        const jsonText = this.extractJson(rawText);
        let generatedConfig;

        try {
            generatedConfig = JSON.parse(jsonText);
        } catch (error) {
            const parseError = new Error('Gemini returned invalid JSON');
            parseError.statusCode = 422;
            throw parseError;
        }

        if (!generatedConfig.version) {
            generatedConfig.version = 'v1';
        }

        if (generatedConfig.description === undefined) {
            generatedConfig.description = '';
        }

        logger.info('gemini generated api config json successfully');

        return this.validateConfigShape(generatedConfig);
    }

    async recommend(apiConfig) {
        throw new Error('recommend not yet implemented');
    }

    async detectIssues(apiConfig) {
        throw new Error('detectIssues not yet implemented');
    }

    async generateTestCases(apiConfig) {
        throw new Error('generateTestCases not yet implemented');
    }
}

module.exports = new ConfigGenerator();