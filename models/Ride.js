const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  from: { type: String, required: true },
  to: { type: String, required: true },

  departureTime: { type: Date, required: true },

  availableSeats: { type: Number, required: true },

  notes: { type: String },
},
{ timestamps: true }
);

module.exports = mongoose.model('Ride', RideSchema);
