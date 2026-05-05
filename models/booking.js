// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: {
      type: String,
       ref:` User`,
      required: true
    },
    trip: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Trip', 
        required: true 
    },
    
    seats: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    paymentMethod: { 
        type: String, 
        enum: ['cash', 'card', 'paypal'] 
    },
    
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected', 'confirmed'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);