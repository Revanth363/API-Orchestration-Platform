const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

router.post('/generate-config', agentController.generateConfig);

module.exports = router;