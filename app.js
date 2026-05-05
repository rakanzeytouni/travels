 const express = require("express");
require("dotenv").config();
const path = require("path");
const bcrypt = require("bcrypt");
const { Resend } = require("resend");
const sgMail = require('@sendgrid/mail');
const mongoose = require("mongoose"); 
const session = require("express-session");
const { body, validationResult } = require("express-validator");
const MongoStore = require("connect-mongo").default;
const rateLimit = require("express-rate-limit");
const requestIp = require('request-ip');
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const methodOverride = require('method-override');
const passport = require("passport");
const User = require("./models/User.js");
const app = express();
const connectDB = require("./config/db");
connectDB();
require("./config/passport.js");
/* =========================
   Security & View Engine
========================= */

const validateRegister = [
  body("email")
    .isEmail()
    .withMessage("Invalid email")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/)
    .withMessage("Password must contain at least one symbol"),

  // ✅ الصحيح:
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")  // ← Validator أولاً
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters")
    .escape()  // ← Sanitizer أخيراً
];
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net"
        ],

        styleSrc: [
          "'self'",
          "https://cdn.jsdelivr.net"
        ],

        imgSrc: [
          "'self'",
          "data:"
        ],

        fontSrc: [
          "'self'",
          "https://cdn.jsdelivr.net"
        ],

        objectSrc: ["'none'"],

        upgradeInsecureRequests: []
      }
    }
  })
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride('_method'));
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
    secure:false, 
    sameSite: true,
    maxAge: 60 * 60 * 1000,
    path: '/'
    //process.env.NODE_ENV === "production",
    //process.env.NODE_ENV === "production" ? "none" : "lax
  }
}));
 /* 
========================= */


// ✅ تهيئة الـ CSRF - التعديل الوحيد المطلوب هنا


// ✅ بعد session middleware مباشرة (استبدل كل كود csrf-csrf القديم بهذا):
/* =========================
   CSRF Configuration (@edge-csrf/express v2)
========================= */


// ✅ تهيئة الـ CSRF Middleware
const csrfProtection = require("csurf")({
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: true
  }
});

app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.oldInput = req.body || {};
  res.locals.errors = {};
  next();
});

// ✅ Middleware لإتاحة التوكن في جميع ملفات EJS


// في app.js
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}


/* =========================
   Passport
========================= */
app.use(passport.initialize());
app.use(passport.session());

/* =========================
   Global Variables for EJS
========================= */
app.use((req, res, next) => {
  res.locals.user = req.user || req.session.user ;
  res.locals.isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : false;

  next();
});
/* =========================
   Rate Limiting - Production Ready
========================= */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  keyGenerator: (req, res) => {
   const ip = requestIp.getClientIp(req)|| 'unknown';
    const email = (req.body?.email || 'unknown').toLowerCase();
    return `login:${ip}:${email}`; 
  },
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});


const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req, res) => {
    const ip = requestIp.getClientIp(req) || 'unknown';
    const email = (req.session?.pendingEmail || 'unknown').toLowerCase();
    return `verify:${ip}:${email}`; 
  },
  message: { error: "Too many verification attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req, res) => {
    const ip = requestIp.getClientIp(req) || 'unknown';
    return `register:${ip}`;
  },
  message: { error: "Too many registration attempts from this network." },
  standardHeaders: true,
  legacyHeaders: false,
});


app.use("/auth/login", loginLimiter);
app.use("/verify", verifyLimiter);
app.use("/regester", registerLimiter);


/* =========================
routes
========================= */
app.use("/", require("./routes/index.js"));
app.use("/auth", require("./routes/auth.routes.js"));
app.use("/tickets", require("./routes/ticket.routes.js"));
app.use("/admin", require("./routes/admin.routes.js"));


app.get("/regester", (req, res) => {
  res.render("auth/regester", {
    csrfToken: res.locals.csrfToken,
    errors: {},
    oldInput: {}
  });
});

app.post("/regester" , validateRegister, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
  return res.status(400).render("auth/regester", {
    errors:  errors.mapped(), 
    oldInput: req.body,
    csrfToken: res.locals.csrfToken
  });

  }
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
        errors: {email:{ msg: "Email already used" }},
        oldInput: { name, email },
        csrfToken: res.locals.csrfToken
      });
    }

     const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const hashedCode = await bcrypt.hash(verificationCode.toString(), 10);
    const codeExpiry = Date.now() + 15 * 60 * 1000; // 15 دقيقة

 const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      verificationCode: hashedCode,
      verificationCodeExpiry: codeExpiry
    });
    await newUser.save();
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg =({
       to: email,
      from: "vibesguesthouse29@gmail.com",
      subject: "Verify your account",
      html: `<p>Hello ${name}</p><p>Your code: <b>${verificationCode}</b></p>`
    });
  req.session.newuser =newUser ;
    req.session.pendingEmail = email;
    res.render("verifycode/verify", {
      csrfToken: res.locals.csrfToken,
      email,
      oldInput: { code: "" },
      errors: {}
    });
await sgMail.send(msg);

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).render("error", { message: "Something went wrong" });
  }
});

/* =========================
   Verify Route - Hardened
========================= */
app.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body; // استلم البريد مع الكود مباشرة

    if (!email || !code) {
      return res.status(400).render("verifycode/verify", {
        errors: { verify: "Email and code are required" },
        oldInput: { code: "" },
        email: email || "",
        csrfToken: res.locals.csrfToken
      });
    }

    // 1. جلب المستخدم مباشرة من DB
    const user = await User.findOne({ email });

    if (!user || user.isVerified) {
      return res.status(400).render("verifycode/verify", {
        errors: { verify: "Invalid request or already verified" },
        oldInput: { code: "" },
        email,
        csrfToken: res.locals.csrfToken
      });
    }

    // 2. تحقق من انتهاء صلاحية الكود
    if (user.verificationCodeExpiry < Date.now()) {
      return res.status(400).render("verifycode/verify", {
        errors: { verify: "Code expired. Please request a new one." },
        oldInput: { code: "" },
        email,
        csrfToken: res.locals.csrfToken
      });
    }

    // 3. تحقق من الكود
    const isMatch = await bcrypt.compare(code, user.verificationCode);
    if (!isMatch) {
      return res.status(400).render("verifycode/verify", {
        errors: { verify: "Wrong code" },
        oldInput: { code: "" },
        email,
        csrfToken: res.locals.csrfToken
      });
    }

    // 4. تحقق ناجح → حدث المستخدم مباشرة وأمسح الكود
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiry = null;
    await user.save();

    return res.redirect("/"); // تحويل بعد التحقق
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).render("error", { message: "Verification failed" });
  }
});

app.get("/verify" , (req, res) => {
  res.render("verifycode/verify", {
    errors: {},
    oldInput: { code: "" },
    email: "", // ما نعتمد على session بعد هلأ
    csrfToken: res.locals.csrfToken
  });
});
/* =========================
   Pages
========================= */
app.get("/", (req, res) => {
  res.render("layouts/main", { user: req.user || null });
});
app.get("/profile", (req, res) => {
const user = req.user || req.session.user;
  if (!user) {
    return res.render("profile/profile", { 
      user: null, 
      message: "Please sign in to view your profile" 
    });
  }
  // إذا مسجل دخول، اعرض البروفايل مع بيانات المستخدم
  res.render("profile/profile", { 
    user: user,
    name: user.name,
    email: user.email
  });
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
// تأكد من استدعاء الموديل في أعلى الملف
const Ticket = require('./models/Ticket'); 


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