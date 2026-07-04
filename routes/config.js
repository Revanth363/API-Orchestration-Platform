const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// CRUD for API configurations
router.post('/', configController.create);
router.get('/', configController.getAll);
router.get('/:id', configController.getById);
router.put('/:id', configController.update);
router.delete('/:id', configController.delete);

module.exports = router;