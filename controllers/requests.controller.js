 
const Ride = require('../models/Ride');
const RideRequest = require('../models/RideRequest');

// Student sends a request to join a ride
async function createRequest(req, res, next) {
  try {
    const { rideId, message } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    // prevent duplicate requests
    const existing = await RideRequest.findOne({
      ride: rideId,
      student: req.user.id
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: 'You have already requested this ride.' });
    }

    const rr = await RideRequest.create({
      ride: rideId,
      student: req.user.id,
      message
    });

    res.status(201).json({ success: true, data: rr });
  } catch (err) {
    next(err);
  }
}

// Student: view my requests
async function myRequests(req, res, next) {
  try {
    const list = await RideRequest.find({ student: req.user.id })
      .populate('ride')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

// Driver/Admin: view requests for my rides
async function incomingForDriver(req, res, next) {
  try {
    // get all requests + rides, then filter by rides I own
    const all = await RideRequest.find()
      .populate('ride')
      .populate('student', 'name email');

    const mine = all.filter(
      (rr) => rr.ride && rr.ride.driver.toString() === req.user.id
    );

    res.json({ success: true, data: mine });
  } catch (err) {
    next(err);
  }
}

// Driver/Admin: accept or reject a request
async function setStatus(req, res, next) {
  try {
    const { status } = req.body; // "Accepted" or "Rejected"
    const rr = await RideRequest.findById(req.params.id).populate('ride');

    if (!rr) return res.status(404).json({ message: 'Request not found' });

    // only the driver who owns the ride OR admin
    if (
      rr.ride.driver.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // if accepting, ensure seat available
    if (status === 'Accepted') {
      if (rr.ride.availableSeats <= 0) {
        return res
          .status(400)
          .json({ message: 'No available seats remaining for this ride.' });
      }
      // decrement seat once
      if (rr.status !== 'Accepted') {
        rr.ride.availableSeats -= 1;
        await rr.ride.save();
      }
    }

    rr.status = status;
    await rr.save();

    res.json({ success: true, data: rr });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRequest,
  myRequests,
  incomingForDriver,
  setStatus
};
