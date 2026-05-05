// middleware/auth.middleware.js
module.exports = (req, res, next) => {
    // تحقق إذا المستخدم مسجل دخول
    if (req.session && req.session.user) {
        return next(); // مسموح له يكمل
    }

    // احفظ الصفحة اللي كان بدو يوصلها عشان ترجعلو بعد الـ Login
    req.session.redirectAfterLogin = req.originalUrl;
    
    // حوّله لصفحة الدخول (عدّل المسار حسب مشروعك)
    res.redirect('/auth/login');
};