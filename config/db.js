const mongoose = require('mongoose');
const logger = require('../utils/logger');

const DEFAULT_RETRY_ATTEMPTS = Number(process.env.MONGODB_RETRY_ATTEMPTS || 10);
const DEFAULT_RETRY_DELAY_MS = Number(process.env.MONGODB_RETRY_DELAY_MS || 3000);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        logger.error('mongodb connection failed: MONGODB_URI is not set');
        process.exit(1);
    }

    let lastError = null;

    for (let attempt = 1; attempt <= DEFAULT_RETRY_ATTEMPTS; attempt += 1) {
        try {
            const conn = await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000
            });

            logger.info(`mongodb connected: ${conn.connection.host}`);
            return conn;
        } catch (error) {
            lastError = error;
            logger.warn(
                `mongodb connection attempt ${attempt}/${DEFAULT_RETRY_ATTEMPTS} failed: ${error.message}`
            );

            if (attempt < DEFAULT_RETRY_ATTEMPTS) {
                await delay(DEFAULT_RETRY_DELAY_MS);
            }
        }
    }

    logger.error(`mongodb connection failed after ${DEFAULT_RETRY_ATTEMPTS} attempts: ${lastError.message}`);
    process.exit(1);
};

module.exports = connectDB;