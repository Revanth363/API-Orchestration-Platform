const mongoose = require('mongoose');

const workflowStepSchema = new mongoose.Schema(
    {
        step: {
            type: Number,
            required: true
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true
        },
        requestMapping: {
            type: Map,
            of: String,
            default: {}
        },
        responseMapping: {
            type: Map,
            of: String,
            default: {}
        },
        condition: {
            field: { type: String, default: null },
            operator: {
                type: String,
                enum: ['eq', 'neq', 'gt', 'lt', 'exists', 'contains'],
                default: null
            },
            value: { type: mongoose.Schema.Types.Mixed, default: null }
        },
        parallel: {
            type: Boolean,
            default: false
        },
        onFailure: {
            type: String,
            enum: ['STOP', 'CONTINUE', 'SKIP'],
            default: 'STOP'
        }
    },
    { _id: false }
);

const validationRuleSchema = new mongoose.Schema(
    {
        field: { type: String, required: true },
        required: { type: Boolean, default: false },
        type: {
            type: String,
            enum: ['string', 'number', 'boolean', 'email', 'custom'],
            default: 'string'
        },
        regex: { type: String, default: null },
        message: { type: String, default: null }
    },
    { _id: false }
);

const apiConfigSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        endpoint: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        method: {
            type: String,
            required: true,
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            uppercase: true
        },
        version: {
            type: String,
            default: 'v1'
        },
        validation: [validationRuleSchema],
        workflow: [workflowStepSchema],
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('ApiConfig', apiConfigSchema);