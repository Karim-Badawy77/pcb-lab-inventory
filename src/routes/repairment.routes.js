const express = require('express');
const controller = require('../controllers/repairment.controller');
const router = express.Router();
router.route('/item/:itemId').post(controller.create).get(controller.list);
router.route('/:id').get(controller.get).patch(controller.update).delete(controller.remove);
module.exports = router;
