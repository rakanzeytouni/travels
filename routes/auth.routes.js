const express = require("express");
const passport = require("passport");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const csrf = require("csurf");

const router = express.Router();

// CSRF Protection للـ routes اللي فيها forms
// CSRF Protection للـ routes اللي فيها forms

/*=======================
   Google OAuth
========================= */
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/login",
    failureMessage: true
  }),
  (req, res) => {
    res.redirect("/");
  }
);

/* =========================
   Login Routes
========================= */
router.get("/login",  (req, res) => {
  res.render("auth/login", {
    errors: {},
    oldInput: {},
  csrfToken: req.csrfToken()
  });
});

router.post("/login",async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Input Validation
    if (!email || !password) {
      return res.status(400).render("auth/login", {
        errors: { fields: "All fields required" },
        oldInput: { email }, // ← ما تضيف password!
      csrfToken: req.csrfToken()
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).render("auth/login", {
        errors: { email: "Invalid email format" },
        oldInput: { email },
         csrfToken: req.csrfToken()
      });
    }

    // 2. Find User
    const user = await User.findOne({ email });
  
    const genericError = { auth: "Invalid email or password" };

    if (!user) {
      return res.status(401).render("auth/login", {
        errors: genericError,
        oldInput: { email },
     csrfToken: req.csrfToken()
      });
    }

    // 3. Check Account Lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).render("auth/login", {
        errors: { auth: `Account locked. Try again in ${minutesLeft} minutes` },
        oldInput: { email },
       csrfToken: req.csrfToken()  
      });
    }

    // 4. Check Email Verification
    if (!user.isVerified) {
      return res.status(401).render("auth/login", {
        errors: { auth: "Please verify your email first" },
        oldInput: { email },
         csrfToken: req.csrfToken()
      });
    }

    // 5. Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000; 
        return res.status(401).render("auth/login",{
          errors:{lokacount:` Account locked: ${email}`}})
    
      }
      
      await user.save();  
      return res.status(401).render("auth/login", {
        errors: genericError,
        oldInput: { email },
         csrfToken: req.csrfToken()
      });
    }

    // 6. Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  req.session.user = user;
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration error:", err);
        return res.status(500).render("error", { message: "Server error" });
      }

      req.session.userId = user._id;
      req.session.user = {
        id: user._id,
        email: user.email,
        name: user.name
      };
      
    
      res.redirect("/");
    });

  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).render("error", { message: "Something went wrong" });
  }
});

/* =========================
   Logout Route
=*/
router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) console.error("Session destroy error:", err);
      res.clearCookie("connect.sid"); // اسم الكوكي الافتراضي
      res.redirect("/");
    });
  });
});
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.redirect("/");
  });
});



module.exports = router;