const express = require('express');
const {
    createAppointment,
    // getAllAppointments,
    // getMyAppointments,
    // getAppointmentById,
    // updateAppointment,
    // deleteAppointment
} = require('../controllers/registrationformcontroller');
// const { isAuthenticated, isAdminAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', createAppointment);
// router.get('/mine', isAuthenticated, getMyAppointments);
// router.get('/', isAdminAuthenticated, getAllAppointments);
// router.get('/:id', isAdminAuthenticated, getAppointmentById);
// router.put('/:id', isAdminAuthenticated, updateAppointment);
// router.delete('/:id', isAdminAuthenticated, deleteAppointment);

module.exports = router;
