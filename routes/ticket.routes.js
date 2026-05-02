const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');

router.get('/search', ticketController.searchTrips);

module.exports = router;
