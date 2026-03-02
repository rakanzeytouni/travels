const passport = require("passport");
// config/passport.js
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User"); // تأكد من مسار الملف

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback" // تأكد أن هذا يطابق الرابط في Cloud Console
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1️⃣ أولاً: ابحث عن مستخدم لديه هذا الإيميل
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // ✅ الحالة الأولى: المستخدم موجود مسبقاً (سواء سجل عبر Google أو عادي)
        // نقوم بتحديث بياناته لضمان وجود اسم Google وصورة Google
        user.name = profile.displayName || user.name;
        user.googleId = profile.id; 
        user.avatar = profile.photos[0]?.value || user.avatar;
        user.isVerified = true; // نعتبره موثق لأن جوجل وثقه
        await user.save();
        
        return done(null, user); // تسجيل دخول ناجح
      }

      // 2️⃣ الحالة الثانية: مستخدم جديد تماماً، ننشئ له حساب
      const newUser = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        avatar: profile.photos[0]?.value,
        isVerified: true, // جوجل يوثق الإيميل تلقائياً
        password: Math.random().toString(36).slice(-8) // كلمة مرور عشوائية (لن يستخدمها)
      });

      return done(null, newUser);

    } catch (err) {
      return done(err, null);
    }
  }

));
passport.serializeUser((user, done) => {
  done(null, user.id); 
});passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});