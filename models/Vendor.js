const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        baseUrl: {
            type: String,
            required: true,
            trim: true
        },
        endpoint: {
            type: String,
            required: true,
            trim: true
        },
        method: {
            type: String,
            required: true,
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            uppercase: true
        },
        headers: {
            type: Map,
            of: String,
            default: {}
        },
        authentication: {
            type: {
                type: String,
                enum: ['NONE', 'API_KEY', 'BEARER'],
                default: 'NONE'
            },
            value: {
                type: String,
                default: ''
            }
        },
        timeout: {
            type: Number,
            default: 5000
        },
        retry: {
            count: {
                type: Number,
                default: 3
            },
            delay: {
                type: Number,
                default: 1000
            }
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Vendor', vendorSchema);