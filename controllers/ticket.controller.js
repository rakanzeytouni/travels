const Trip = require('../models/Trip');
const Ticket = require("../models/Ticket");
const Booking = require('../models/Booking');


exports.searchTrips = async (req, res) => {
    const { from, to, date } = req.query;

    try {
        const trips = await Trip.find({
            from,
            to,
            date
        });

        res.render('tickets/search', {
            results: trips,
            searchParams: { from, to, date }
        });

    } catch (err) {
        console.error(err);
        res.status(500).render("error", { message: "Error fetching trips" });
    }
};

exports.createTicket = async (req, res) => {
const createTicketLogic = async ({ user, tripId, seats, paymentMethod }) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new Error("Trip not found");

  const totalPrice = trip.price * seats;

  const ticket = new Ticket({
    user,
    trip: tripId,
    seats,
    totalPrice,
    paymentMethod
  });

  await ticket.save();
  return ticket;
};
};
// ... existing code ...

// ✅ GET /tickets/book/:id - Show booking page for a specific trip
exports.bookTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).render('error', { message: 'Trip not found' });

        res.render('tickets/book', { 
            trip,
            user: req.session.user, // مضمون وجوده
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (err) {
        res.status(500).render('error', { message: err.message });
    }
};

exports.submitBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { seats, paymentMethod } = req.body; // حذفت email لأنه مش لازم

        const seatsCount = parseInt(seats, 10);
        if (isNaN(seatsCount) || seatsCount < 1) {
            return res.status(400).render('error', { message: 'Invalid number of seats' });
        }

        const trip = await Trip.findById(id);
        if (!trip) return res.status(404).render('error', { message: 'Trip not found' });

        const Ticket = require('../models/Ticket');
        
        const newBooking = new Ticket({
            user: req.session.user.id,
            name: req.session.user.name,       
            trip: id,
            seats: seatsCount,
            totalPrice: trip.price * seatsCount,
            paymentMethod: paymentMethod || 'cash',
            status: 'pending'
        });

        await newBooking.save();
        console.log('✅ Booking saved successfully'); // Optional: for debugging only
           return res.redirect('/tickets/my-tickets');
        
    } catch (err) {
        console.error('❌ Booking error:', err);
        res.status(500).render('error', { message: 'Booking failed: ' + err.message });
    }
};
