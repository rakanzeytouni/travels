const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, 
    ref:` User`, // أو ObjectId إذا عندك users table
    required: true
  },
  name: {
      type: String,
       ref:` User`,
      required: true
    },

  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    required: true
  },

  seats: {
    type: Number,
    required: true,
    min: 1
  },

  totalPrice: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending"
  },

  paymentMethod: {
    type: String,
    enum: ["cash", "card"],
    default: "cash"
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
      status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected', 'confirmed'],
        default: 'pending'
    }
}, { timestamps: true });



module.exports = mongoose.model("Ticket", ticketSchema);