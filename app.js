require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const routes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const vendorRoutes = require('./vendors/vendorRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'server is running' });
});

//mock vendors
app.use('/vendors', vendorRoutes);

// api platform
app.use('/api/v1', routes);

// global error handler - always last
app.use(errorHandler);

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        logger.info(`server started on port ${PORT}`);
    });
};

startServer();

module.exports = app;