const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies.authToken;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();

    if (!user || !user.isActive) {
      req.user = null;
      return next();
    }

    req.user = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    next();
  } catch (err) {
    console.error('protect middleware error:', err.message);
    req.user = null;
    next();
  }
};

exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send('Access denied');
    }
    next();
  };
};

