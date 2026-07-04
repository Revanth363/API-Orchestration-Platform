const mongoose = require('mongoose');
const { STATUS } = require('../constants/status');

const stepLogSchema = new mongoose.Schema(
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
        status: {
            type: String,
            enum: Object.values(STATUS),
            required: true
        },
        requestPayload: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        responsePayload: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        retryAttempts: {
            type: Number,
            default: 0
        },
        startedAt: {
            type: Date,
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        },
        duration: {
            type: Number,
            default: 0
        },
        error: {
            type: String,
            default: null
        }
    },
    { _id: false }
);

const executionLogSchema = new mongoose.Schema(
    {
        requestId: {
            type: String,
            required: true,
            unique: true
        },
        apiConfigId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ApiConfig',
            required: true
        },
        endpoint: {
            type: String,
            required: true
        },
        method: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: Object.values(STATUS),
            required: true
        },
        originalRequest: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        finalResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        steps: [stepLogSchema],
        startedAt: {
            type: Date,
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        },
        totalDuration: {
            type: Number,
            default: 0
        },
        error: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('ExecutionLog', executionLogSchema);