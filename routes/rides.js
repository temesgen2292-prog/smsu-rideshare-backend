const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  getRides,
  getRide,
  createRide,
  updateRide,
  deleteRide
} = require('../controllers/ridesController');

// PUBLIC ROUTES
router.get('/', getRides);
router.get('/:id', getRide);

// DRIVER + ADMIN ROUTES
router.post('/', protect, requireRole('driver', 'admin'), createRide);
router.put('/:id', protect, requireRole('driver', 'admin'), updateRide);
router.delete('/:id', protect, requireRole('driver', 'admin'), deleteRide);

// EJS FORM: POST RIDE
router.post('/new', protect, requireRole('driver'), createRide);

module.exports = router;
