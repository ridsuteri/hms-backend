const express = require('express');
const router = express.Router();

// Define routes on the router instance
router.get('/', (req, res) => {
  res.send('Get all users');
});

router.get('/:id', (req, res) => {
  res.send(`Get user with ID: ${req.params.id}`);
});

// Export the router for use in the main app
module.exports = router;
