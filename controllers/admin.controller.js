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