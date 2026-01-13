const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const upload = require('../middlewares/upload.middleware');
const { protect } = require('../middlewares/auth.middleware');
// const { checkRole } = require('../middlewares/role.middleware');


router.post('/', protect, upload.single('image'), maintenanceController.createRequest);
router.get('/', protect, maintenanceController.getAllRequests);
router.patch('/:id', protect, maintenanceController.updateRequestStatus);

module.exports = router; 