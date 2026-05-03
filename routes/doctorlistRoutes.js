const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorListController.js');
// const { isAdminAuthenticated } = require('../middleware/authMiddleware.js');

// router.get('/doctors', doctorController.getAllDoctors);
// router.get('/doctors/:id', doctorController.getDoctorById);
router.post('/doctors', doctorController.createDoctor);
// router.put('/doctors/:id', isAdminAuthenticated, doctorController.updateDoctor);
// router.delete('/doctors/:id', isAdminAuthenticated, doctorController.deleteDoctor);

module.exports = router;
