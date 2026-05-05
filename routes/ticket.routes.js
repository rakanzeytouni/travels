const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const requireAuth = require('../middleware/auth.middleware');
const Ticket = require('../models/Ticket'); // ✅ أضف هذا السطر! ← هذا هو الحل

router.get('/search', ticketController.searchTrips);
router.get('/book/:id', ticketController.bookTrip);
router.post('/book/:id', requireAuth, ticketController.submitBooking);

// ✅ الآن هالراوت رح يشتغل لأن Ticket معرف
router.get('/my-tickets', async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/auth/login');

        const bookings = await Ticket.find({ user: req.session.user.id })
            .populate('trip', 'from to date airline')
            .sort({ createdAt: -1 });

        res.render('tickets/my-tickets', { bookings });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Error loading tickets' });
    }
});

module.exports = router;