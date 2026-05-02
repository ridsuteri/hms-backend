const express = require('express');
const {signup, login } = require('../controllers/authController')

const router = express.Router();

router.post('/signup', signup)
router.post('/login', login)

// Export the router for use in the main app
module.exports = router;
