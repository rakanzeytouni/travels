const Trip = require('../models/Trip');

// add trip (admin)
exports.createTrip = async (req, res) => {
    const trip = new Trip(req.body);
    await trip.save();
   res.redirect("/admin/trips")
};

// update price
exports.updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;

    const trip = await Trip.findByIdAndUpdate(
      id,
      { price },
      { returnDocument: 'after', runValidators: true }
    );

 res.redirect('/admin/trips');

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.deletetrips=async(req, res)=>{
    try{
         const  {id}  = req.params;
       const deletetrip=await Trip.deleteOne({ _id: id }) 
     res.redirect('/admin/trips');

    }catch(err){
        res.status(500).json({message:err.message});
    }
}
const Ticket = require('../models/Ticket');

// ✅ جلب كل الحجوزات مع تفاصيل الرحلة والمستخدم
exports.getBookings = async (req, res) => {
    try {
        const bookings = await Ticket.find()
            .populate('trip', 'from to date price airline') // جلب بيانات الرحلة
            .populate('user', 'name`,`email')                 // جلب بيانات المستخدم (إذا موجود)
            .sort({ createdAt: -1 });                       // الأحدث أولاً

        res.render('admin/bookings', { 
            bookings,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (err) {
        res.status(500).render('error', { message: err.message });
    }
};

// ✅ تحديث حالة الحجز
exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; 

        if (!['accept', 'reject'].includes(status)) {
            return res.status(400).send('Invalid status value');
        }

        await Ticket.findByIdAndUpdate(id, { status }, { runValidators: true });
        res.redirect('/admin/bookings');
    } catch (err) {
        res.status(500).render('error', { message: err.message });
    }
};