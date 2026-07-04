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
        },
        responseSchema: {
            verificationStatus: 'string - VALID or INVALID',
            score: 'number - confidence score 0 to 100',
            panNumber: 'string',
            fullName: 'string'
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
        },
        responseSchema: {
            result: 'string - SUCCESS or FAILURE',
            confidence: 'number - confidence score 0 to 100',
            documentId: 'string'
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
        },
        responseSchema: {
        status: 'VERIFIED or FAILED',
        aadhaarNumber: 'string',
        name: 'string',
        verifiedAt: 'ISO date string'
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
        },
        responseSchema: {
            name: 'string - extracted name',
            dob: 'string - extracted date of birth',
            documentType: 'string - extracted document type',
            documentNumber: 'string - extracted document number',
            confidence: 'number - OCR confidence 0 to 100',
            status: 'string - EXTRACTED or FAILED'
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
        },
        responseSchema: {
            fraudScore: 'number - fraud score 0 to 100',
            riskLevel: 'string - LOW MEDIUM or HIGH',
            flagged: 'boolean - true if flagged for fraud',
            documentNumber: 'string',
            checkedAt: 'string - ISO date'
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
        },
        responseSchema: {
            matched: 'boolean - true if face matched',
            similarity: 'number - similarity score 0 to 100',
            status: 'string - MATCH or NO_MATCH',
            checkedAt: 'string - ISO date'
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

        // print ids and endpoints for reference
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