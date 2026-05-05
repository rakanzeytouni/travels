const express = require("express");
const router = express.Router();
const isAdmin = require("../middleware/admin.middleware");
const controller = require('../controllers/admin.controller');
const { createTicketLogic } = require("../controllers/ticket.controller");
const Booking = require("../models/Ticket");




router.get("/login", (req, res) => {

  res.render("admin/loginadmin", { error: null }); 
});


router.post("/login", (req, res) => {
  const admin_name = process.env.ADMIN_USER;
  const password = process.env.PASSWORD_ADMIN;
  
  
  const { username, pass } = req.body;

  
  if (username === admin_name && pass === password) {

    req.session.admin = true; 
    return res.redirect("/admin/dachboard"); 
  }
  


  res.render("admin/loginadmin", { error: "Wrong username or password " });
});


router.get("/dachboard",isAdmin,(req, res) => {
  
  res.render("admin/dachboard"); 
});

router.get('/trips', async (req, res) => {
    const Trip = require('../models/Trip');
    const trips = await Trip.find();

    res.render('admin/trips', { trips });
});

// create
router.post('/trips', controller.createTrip);
// update
router.put('/trips/:id', controller.updatePrice);
router.delete(`/trips/:id`, controller.deletetrips);

router.get('/tiketsv',(req, res) => {
   res.render("admin/tiketsv");
});
router.get("/bookings", async (req, res) => {
  const bookings = await Booking.find().populate("trip");
  res.render("admin/bookings", { bookings });
});

router.post("/bookings/:id/accepted", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.send("Booking not found");

    booking.status = "accepted";
    await booking.save();

    res.redirect("/admin/bookings");

  } catch (err) {
    res.send(err.message);
  }
});


module.exports = router;