const express = require("express");
const passport = require("passport");
const User = require("../models/User");

const bcrypt = require("bcrypt");
const router = express.Router();


router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);


router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  (req, res) => {
    res.redirect("/layouts/main");
  }
);
router.get("/login", (req, res) => {
  res.render("auth/login",{
    errors:{},
    oldInput:{}
  });
});

router.post("/login", async (req, res) => {
    try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render("auth/login", {
        errors: { fields: "All fields required" },
       oldInput: { email , }
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("auth/login", {
        errors: { user: "User not found" },
        oldInput: { email }
      });
    }

    if (!user.isVerified) {
      return res.status(400).send("verify your email first");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).render("auth/login", {
        errors: { password: "Incorrect password" },
        oldInput: { email, password}
      });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).send("Server error");

      req.session.userId = user._id;
      res.redirect("/dashboard");
    });

  } catch (error) {
    res.status(500).send(error.message);
  }
});





module.exports = router;