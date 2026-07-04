require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const logger = require('../utils/logger');

const vendors = [
    {
        name: 'VendorA',
        description: 'PAN verification vendor - expects panNumber and fullName',
        baseUrl: 'http://localhost:5000',
        endpoint: '/vendors/vendorA/verify-pan',
        method: 'POST',
        headers: {},
        authentication: {
            type: 'NONE',
            value: ''
        },
        timeout: 5000,
        retry: {
            count: 3,
            delay: 1000
        }
    },
    {
        name: 'VendorB',
        description: 'PAN verification vendor (different format) - expects documentId',
        baseUrl: 'http://localhost:5000',
        endpoint: '/vendors/vendorB/verify-pan',
        method: 'POST',
        headers: {},
        authentication: {
            type: 'NONE',
            value: ''
        },
        timeout: 5000,
        retry: {
            count: 3,
            delay: 1000
        }
    },
    {
        name: 'VendorC',
        description: 'Aadhaar verification vendor - expects aadhaarNumber and name',
        baseUrl: 'http://localhost:5000',
        endpoint: '/vendors/vendorC/verify-aadhaar',
        method: 'POST',
        headers: {},
        authentication: {
            type: 'NONE',
            value: ''
        },
        timeout: 5000,
        retry: {
            count: 3,
            delay: 1000
        }
    },
    {
        name: 'VendorD',
        description: 'OCR extraction vendor - expects documentBase64',
        baseUrl: 'http://localhost:5000',
        endpoint: '/vendors/vendorD/ocr-extract',
        method: 'POST',
        headers: {},
        authentication: {
            type: 'NONE',
            value: ''
        },
        timeout: 10000,
        retry: {
            count: 2,
            delay: 2000
        }
    },
    {
        name: 'VendorE',
        description: 'Fraud detection vendor - expects name and documentNumber',
        baseUrl: 'http://localhost:5000',
        endpoint: '/vendors/vendorE/fraud-detect',
        method: 'POST',
        headers: {},
        authentication: {
            type: 'NONE',
            value: ''
        },
        timeout: 8000,
        retry: {
            count: 3,
            delay: 1000
        }
    },
    {
        name: 'VendorF',
        description: 'Face match vendor - expects selfieBase64 and documentBase64',
        baseUrl: 'http://localhost:5000',
        endpoint: '/vendors/vendorF/face-match',
        method: 'POST',
        headers: {},
        authentication: {
            type: 'NONE',
            value: ''
        },
        timeout: 8000,
        retry: {
            count: 3,
            delay: 1000
        }
    }
];

const seedVendors = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('connected to mongodb for seeding vendors');

        // clear existing vendors
        await Vendor.deleteMany({});
        logger.info('cleared existing vendors');

        // insert fresh vendors
        const inserted = await Vendor.insertMany(vendors);
        logger.info(`seeded ${inserted.length} vendors successfully`);

        // print ids so we can use them in apiConfigs seed
        inserted.forEach(v => {
            logger.info(`${v.name} | id: ${v._id} | endpoint: ${v.endpoint}`);
        });

    } catch (error) {
        logger.error(`vendor seeding failed: ${error.message}`);
    } finally {
        await mongoose.disconnect();
        logger.info('disconnected from mongodb');
    }
};

seedVendors();