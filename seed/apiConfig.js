require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const ApiConfig = require('../models/ApiConfig');
const logger = require('../utils/logger');

const seedApiConfigs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('connected to mongodb for seeding api configs');

        // query vendors by name - portable across fresh seeds
        const vendorA = await Vendor.findOne({ name: 'VendorA' });
        const vendorC = await Vendor.findOne({ name: 'VendorC' });
        const vendorD = await Vendor.findOne({ name: 'VendorD' });
        const vendorE = await Vendor.findOne({ name: 'VendorE' });
        const vendorF = await Vendor.findOne({ name: 'VendorF' });

        if (!vendorA || !vendorC || !vendorD || !vendorE || !vendorF) {
            throw new Error('one or more vendors not found - run seed/vendors.js first');
        }

        // clear existing configs
        await ApiConfig.deleteMany({});
        logger.info('cleared existing api configs');

        const apiConfigs = [

            // -------------------------------------------------------
            // Config 1: Single-step PAN verification using VendorA
            // demonstrates: request mapping, response mapping, validation
            // -------------------------------------------------------
            {
                name: 'Verify PAN',
                description: 'validates a PAN number using VendorA. maps pan+name to panNumber+fullName',
                endpoint: '/verify-pan',
                method: 'POST',
                version: 'v1',
                validation: [
                    {
                        field: 'pan',
                        required: true,
                        type: 'string',
                        regex: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
                        message: 'pan must be in valid format eg. ABCDE1234F'
                    },
                    {
                        field: 'name',
                        required: true,
                        type: 'string',
                        message: 'name is required'
                    }
                ],
                workflow: [
                    {
                        step: 1,
                        vendor: vendorA._id,
                        requestMapping: {
                            pan: 'panNumber',
                            name: 'fullName'
                        },
                        responseMapping: {
                            verificationStatus: 'status',
                            score: 'confidence'
                        },
                        condition: {
                            field: null,
                            operator: null,
                            value: null
                        },
                        parallel: false,
                        onFailure: 'STOP'
                    }
                ]
            },

            // -------------------------------------------------------
            // Config 2: Single-step Aadhaar verification using VendorC
            // demonstrates: different validation rules, different mapping
            // -------------------------------------------------------
            {
                name: 'Verify Aadhaar',
                description: 'validates an aadhaar number using VendorC. maps aadhaar+name fields',
                endpoint: '/verify-aadhaar',
                method: 'POST',
                version: 'v1',
                validation: [
                    {
                        field: 'aadhaar',
                        required: true,
                        type: 'string',
                        regex: '^[0-9]{12}$',
                        message: 'aadhaar must be a 12 digit number'
                    },
                    {
                        field: 'name',
                        required: true,
                        type: 'string',
                        message: 'name is required'
                    }
                ],
                workflow: [
                    {
                        step: 1,
                        vendor: vendorC._id,
                        requestMapping: {
                            aadhaar: 'aadhaarNumber',
                            name: 'name'
                        },
                        responseMapping: {
                            status: 'verificationStatus',
                            verifiedAt: 'verifiedAt'
                        },
                        condition: {
                            field: null,
                            operator: null,
                            value: null
                        },
                        parallel: false,
                        onFailure: 'STOP'
                    }
                ]
            },

            // -------------------------------------------------------
            // Config 3: Multi-step document verification pipeline
            // Step 1 - OCR extraction (VendorD)
            // Step 2 - Fraud detection (VendorE) - runs only if OCR succeeded
            // Step 3 - Face match (VendorF) - runs only if fraud score is low
            // demonstrates: multi-step, conditions, response aggregation
            // -------------------------------------------------------
            {
                name: 'Verify Document',
                description: 'full document verification pipeline - ocr then fraud detection then face match',
                endpoint: '/verify-document',
                method: 'POST',
                version: 'v1',
                validation: [
                    {
                        field: 'documentBase64',
                        required: true,
                        type: 'string',
                        message: 'documentBase64 is required'
                    },
                    {
                        field: 'selfieBase64',
                        required: true,
                        type: 'string',
                        message: 'selfieBase64 is required'
                    }
                ],
                workflow: [
                    // step 1 - OCR extraction
                    // no condition - always runs first
                    {
                        step: 1,
                        vendor: vendorD._id,
                        requestMapping: {
                            documentBase64: 'documentBase64'
                        },
                        responseMapping: {
                            name: 'name',
                            documentNumber: 'documentNumber',
                            documentType: 'documentType',
                            confidence: 'ocrConfidence',
                            status: 'ocrStatus'
                        },
                        condition: {
                            field: null,
                            operator: null,
                            value: null
                        },
                        parallel: false,
                        onFailure: 'STOP'
                    },

                    // step 2 - fraud detection
                    // only runs if ocr extraction succeeded
                    {
                        step: 2,
                        vendor: vendorE._id,
                        requestMapping: {
                            name: 'name',
                            documentNumber: 'documentNumber',
                            documentType: 'documentType'
                        },
                        responseMapping: {
                            fraudScore: 'fraudScore',
                            riskLevel: 'riskLevel',
                            flagged: 'isFlagged'
                        },
                        condition: {
                            field: 'ocrStatus',
                            operator: 'eq',
                            value: 'EXTRACTED'
                        },
                        parallel: false,
                        onFailure: 'STOP'
                    },

                    // step 3 - face match
                    // only runs if not flagged for fraud
                    {
                        step: 3,
                        vendor: vendorF._id,
                        requestMapping: {
                            selfieBase64: 'selfieBase64',
                            documentBase64: 'documentBase64'
                        },
                        responseMapping: {
                            matched: 'faceMatched',
                            similarity: 'similarity',
                            status: 'faceMatchStatus'
                        },
                        condition: {
                            field: 'isFlagged',
                            operator: 'eq',
                            value: false
                        },
                        parallel: false,
                        onFailure: 'CONTINUE'
                    }
                ]
            }
        ];

        const inserted = await ApiConfig.insertMany(apiConfigs);
        logger.info(`seeded ${inserted.length} api configs successfully`);

        inserted.forEach(c => {
            logger.info(`${c.name} | endpoint: ${c.endpoint} | steps: ${c.workflow.length}`);
        });

    } catch (error) {
        logger.error(`api config seeding failed: ${error.message}`);
    } finally {
        await mongoose.disconnect();
        logger.info('disconnected from mongodb');
    }
};

seedApiConfigs();