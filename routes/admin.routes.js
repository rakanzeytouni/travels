const express = require("express");
const router = express.Router();
const isAdmin = require("../middleware/admin.middleware");
const controller = require('../controllers/admin.controller');



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

module.exports = router;