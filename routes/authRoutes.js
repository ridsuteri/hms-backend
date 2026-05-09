const express = require('express');
const { signup, login, getCurrentUser } = require('../controllers/authController')
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

router.post('/signup', signup)
router.post('/login', login)
router.post('/signin', login)
router.get('/me', isAuthenticated, getCurrentUser)

// Export the router for use in the main app
module.exports = router;
