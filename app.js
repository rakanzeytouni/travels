const express = require("express");
require("dotenv").config();
const path = require("path");
const bcrypt = require("bcrypt");
const { Resend } = require("resend");

const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const passport = require("passport");

const User = require("./models/User.js");

const app = express();

require("./config/db.js");
require("./config/passport.js");

/* =========================
   Security & View Engine
========================= */
app.use(helmet());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, "public")));
app.set('trust proxy', 1);
/* =========================
   Parsing
========================= */
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Session
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
    // ✅ هام جداً: true في الإنتاج (لأن Render تستخدم HTTPS)
    secure: process.env.NODE_ENV === "production",
    // ✅ هام جداً: 'none' يسمح للكوكي بالعمل مع النطاقات الخارجية/الآمنة
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 60 * 60 * 1000,
    path: '/'
  }
}));
// داخل Middleware التحقق من CSRF



/* =========================
   Passport
========================= */
app.use(passport.initialize());
app.use(passport.session());

/* =========================
   CSRF (Simple & Safe for Dev)
========================= */
// ✅ توليد توكن بسيط للـ views بدون باكجات خارجية
app.use((req, res, next) => {
  if (!req.session._csrf) {
    req.session._csrf = Math.random().toString(36).substring(2);
  }
  console.log("Session Token:", req.session._csrf);
  res.locals.csrfToken = req.session._csrf;
  res.locals.oldInput = req.body || {};
  res.locals.errors = {};
  next();
});

// ✅ تحقق بسيط من CSRF (للتطوير)
app.use((req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const token = req.body._csrf || req.headers["x-csrf-token"];
    if (token && token !== req.session._csrf) {
      return res.status(403).render("error", { message: "CSRF token mismatch" });
    }
    console.log("Received Token:", token);
  }
  next();
});

/* =========================
   Rate Limit
========================= */
app.use("/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: "Too many attempts, try again later"
}));

/* =========================
   Routes ✅ تصحيح: rootes → routes
========================= */
app.use("/", require("./rootes/index.js"));
app.use("/auth", require("./rootes/auth.routes.js"));
app.use("/tickets", require("./rootes/ticket.routes.js"));
app.use("/admin", require("./rootes/admin.routes.js"));

/* =========================
   Register Route ✅ تصحيح: regester → register
========================= */
app.get("/regester", (req, res) => {
  res.render("auth/regester", {
    csrfToken: res.locals.csrfToken,
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
        oldInput: { name, email },
        csrfToken: res.locals.csrfToken
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).render("auth/regester", {
        errors: { password: "Password must contain uppercase, lowercase, number and symbol" },
        oldInput: { name, email },
        csrfToken: res.locals.csrfToken
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).render("auth/regester", {
        errors: { email: "Email already used" },
        oldInput: { name, email },
        csrfToken: res.locals.csrfToken
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const newUser = new User({ name, email, password: hashedPassword, verificationCode });
    await newUser.save();
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `"Rakan's App" <onboarding@resend.dev>`,
      to: email,
      subject: "Verify your account",
      html: `<p>Hello ${name}</p><p>Your code: <b>${verificationCode}</b></p>`
    });

    req.session.pendingEmail = email;
    res.render("verifycode/verify", {
      csrfToken: res.locals.csrfToken,
      email,
      oldInput: { code: "" },
      errors: {}
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).render("error", { message: "Something went wrong" });
  }
});

/* =========================
   Verify Route
========================= */
app.post("/verify", async (req, res) => {
  try {
    const { code } = req.body;
    const email = req.session.pendingEmail;

    if (!email) {
      return res.status(400).render("verifycode/verify", {
        errors: { verify: "Session expired" },
        oldInput: { code: "" },
        email: "",
        csrfToken: res.locals.csrfToken
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("verifycode/verify", {
        errors: { verify: "User not found" },
        oldInput: { code: "" },
        email,
        csrfToken: res.locals.csrfToken
      });
    }

    if (user.verificationCode && user.verificationCode == Number(code)) {
      user.isVerified = true;
      user.verificationCode = null;
      await user.save();
      delete req.session.pendingEmail;
      return res.redirect("/");
    }

    res.status(400).render("verifycode/verify", {
      errors: { verify: "Invalid or expired code" },
      oldInput: { code: req.body.code || "" },
      email,
      csrfToken: res.locals.csrfToken
    });

  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).render("error", { message: "Verification failed" });
  }
});

app.get("/verify", (req, res) => {
  res.render("verifycode/verify", {
    errors: {},
    oldInput: { code: "" },
    email: req.session.pendingEmail || "",
    csrfToken: res.locals.csrfToken
  });
});

/* =========================
   Pages
========================= */
app.get("/", (req, res) => {
  res.render("layouts/main", { user: req.user || null });
});

/* =========================
   Error Handlers
========================= */
app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).render("error", { 
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message 
  });
});

/* =========================
   Server Start
========================= */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down");
  process.exit(0);
});