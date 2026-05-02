const mongoose = require('mongoose');
const tripSchema = new mongoose.Schema({
    from: String,
    to: String,
    date: Date,
    price: Number,
    airline: String
});

module.exports = mongoose.model('Trip', tripSchema);
