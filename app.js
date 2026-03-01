const express = require("express");
require("dotenv").config();
const path = require("path");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid"); 
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const csrf = require("csurf");
const User = require("./models/User.js");
const app = express();
require("./config/db.js");
require("./config/passport.js");
app.use((req,res,next)=>{
   res.locals.oldInput = {};
   res.locals.errors = {};
   next();
});
app.use(helmet());

app.use("/login", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6
}));


app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(cookieParser());
app.use(session({
  secret: process.env.Secret_secsion, 
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, 
    sameSite: "strict",
    maxAge: 60 * 60 * 1000
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);


app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});


app.use("/", require("./rootes/index.js"));
app.use("/auth", require("./rootes/auth.routes.js"));
app.use("/tickets", require("./rootes/ticket.routes.js"));
app.use("/admin", require("./rootes/admin.routes.js"));


app.get("/regester", (req, res) => {
  res.render("auth/regester", {
    errors: {},
    oldInput: {}
  });
});

app.post("/regester", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).send("auth/regester",{
        errors: {},
        oldInput: {}
      });
    }
    function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  return regex.test(password);
};
if (!name || !email || !password) {
  return res.status(400).render("auth/regester", {
        errors: {
          name: !name ? "Name cannot be empty" : null,
          email: !email ? "Email cannot be empty" : null,
          password: !password ? "Password cannot be empty" : null
        },
        oldInput: { name, email }
      });
    };


if (!validatePassword(req.body.password)) {
  return res.status(400).render("auth/regester", {
        errors: {
          password: "Password must contain uppercase, lowercase, number and symbol"
        },
        oldInput: { name, email }
      });
}


    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("Email already used. <a href='auth/regester'>Try again</a>");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationCode,
    });
    
    await newUser.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });


    await transporter.sendMail({
      from: `"Rakan's App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your account ✅",
      html: `<p>Hello ${name},</p>
             <p>Your verification code is: <b>${verificationCode}</b></p>
             <p>Thank you for registering!</p>`,
    });

    res.render("verifycode/verify", { email, oldInput: { code: "" }, errors: {} });
  } catch (error) {
    res.status(500).send(error.message);
  }
});


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
    errors: { verify: "The code does not match, please try again" },
    oldInput: { code: req.body.code || "" },
    email: req.body.email
});
  } catch (error) {
    res.status(500).send(error.message);
  }
});
app.get("/verify", (req, res) => {
    res.render("verifycode/verify", {
        errors: {},
        oldInput: { code: "" },
        email: ""
    });
}); 

app.get("/layouts/main", (req, res) => {
  res.render("layouts/main");
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT)
