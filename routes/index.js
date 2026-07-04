const express = require('express');
const router = express.Router();

const agentRoutes = require('./agent');
const configRoutes = require('./config');
const vendorRoutes = require('./vendor');
const genericRoute = require('./generic');

// management routes
router.use('/agent', agentRoutes);
router.use('/configs', configRoutes);
router.use('/vendors', vendorRoutes);

// this must be last - catches all configured dynamic endpoints
// any request that doesn't match /configs or /vendors falls through to here
router.use('/', genericRoute);

module.exports = router;