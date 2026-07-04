const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        logger.info(`mongodb connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`mongodb connection failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;