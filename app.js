const express = require("express");
require("dotenv").config();
const path = require("path");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const csrf = require("csurf");

const User = require("./models/User.js");

const app = express();

require("./config/db.js");
require("./config/passport.js");

/* =========================
   Security Middlewares
========================= */

app.use(helmet());

/* =========================
   View Engine
========================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   Parsing
========================= */

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Session (Production Ready)
========================= */

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 60 * 60
  }),
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 60 * 60 * 1000
  }
}));

/* =========================
   CSRF Protection
========================= */

const csrfProtection = csrf();
app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.oldInput = {};
  res.locals.errors = {};
  next();
});

/* =========================
   Rate Limit
========================= */

app.use("/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6
}));

/* =========================
   Routes
========================= */

app.use("/", require("./rootes/index.js"));
app.use("/auth", require("./rootes/auth.routes.js"));
app.use("/tickets", require("./rootes/ticket.routes.js"));
app.use("/admin", require("./rootes/admin.routes.js"));

/* =========================
   Register Route
========================= */

app.get("/regester", (req, res) => {
  res.render("auth/regester", {
    errors: {},
    oldInput: {}
  });
});

app.post("/regester", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render("auth/regester", {
        errors: {
          name: !name ? "Name cannot be empty" : null,
          email: !email ? "Email cannot be empty" : null,
          password: !password ? "Password cannot be empty" : null
        },
        oldInput: { name, email }
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).render("auth/regester", {
        errors: {
          password: "Password must contain uppercase, lowercase, number and symbol"
        },
        oldInput: { name, email }
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email already used");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationCode
    });

    await newUser.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Rakan's App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your account",
      html: `
        <p>Hello ${name}</p>
        <p>Your verification code is: <b>${verificationCode}</b></p>
      `
    });

    res.render("verifycode/verify", {
      email,
      oldInput: { code: "" },
      errors: {}
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* =========================
   Verify Route
========================= */

app.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.send("User not found");

    if (user.verificationCode == Number(code)) {
      user.isVerified = true;
      user.verificationCode = null;
      await user.save();

      return res.redirect("/layouts/main");
    }

    res.status(400).render("verifycode/verify", {
      errors: {
        verify: "The code does not match"
      },
      oldInput: { code: req.body.code || "" },
      email
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/verify", (req, res) => {
  res.render("verifycode/verify", {
    errors: {},
    oldInput: { code: "" },
    email: ""
  });
});

/* =========================
   Pages
========================= */

app.get("/layouts/main", (req, res) => {
  res.render("layouts/main");
});

/* =========================
   Error Handler
========================= */

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error");
});

/* =========================
   Server Start
========================= */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("Server running");
});