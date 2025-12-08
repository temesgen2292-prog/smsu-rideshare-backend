// server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

//  Auth-related imports
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { protect, requireRole } = require('./middleware/auth');

// API routes
const usersRoutes = require('./routes/users');
const ridesRoutes = require('./routes/rides');
const messagesRoutes = require('./routes/messages');

//  We are NOT using old authRoutes anymore
// const authRoutes = require('./routes/auth.routes');

dotenv.config();
const { connectDB } = require('./config/db');
connectDB();

const app = express();

/* ---------- VIEW ENGINE: EJS ---------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ---------- STATIC FILES ---------- */
app.use(express.static(path.join(__dirname, 'public')));

// alias /styles.css to the real file in /public/css/style.css
app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'css', 'style.css'));
});

/* ---------- SECURITY / CORE MIDDLEWARE ---------- */
app.use(
  helmet({
    contentSecurityPolicy: false, // okay for dev, tighten later
  })
);

app.use(cors({ origin: true, credentials: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

app.use(hpp());
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// ❌ NO express-session here – we are using JWT cookies

/* ---------- ATTACH req.user FROM JWT ---------- */
// This reads authToken from cookies and sets req.user = { id, fullName, email, role }
app.use(protect);

/* ---------- GLOBAL VARIABLES FOR EJS ---------- */
app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.user;
  res.locals.user = req.user || null;
  next();
});

/* ---------- BASIC PAGES ---------- */

// Optional home route – you can point this anywhere you want
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Login page
app.get('/login', (req, res) => {
  res.render('auth/login', {
    title: 'Login - Mustang RideShare',
    error: req.query.error || '',
    message: req.query.registered ? 'Account created. Please log in.' : '',
  });
});

// Register page
app.get('/register', (req, res) => {
  res.render('auth/register', {
    title: 'Register - Mustang RideShare',
    error: '',
    formData: {},
  });
});

// Logout – clear cookie and redirect to login
app.get('/logout', (req, res) => {
  res.clearCookie('authToken');
  return res.redirect('/login');
});

/* ---------- AUTH LOGIC: POST /login ---------- */

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.redirect('/login?error=Invalid+email+or+password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.redirect('/login?error=Invalid+email+or+password');
    }

    // Create JWT token  (fallback secret so it never crashes)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set httpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false, // set to true when you use HTTPS in production
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect based on role
    if (user.role === 'student') {
      return res.redirect('/dashboard/student');
    } else if (user.role === 'driver') {
      return res.redirect('/dashboard/driver');
    } else {
      return res.redirect('/dashboard/admin');
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.redirect('/login?error=Something+went+wrong');
  }
});

/* ---------- AUTH LOGIC: POST /register ---------- */

app.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.render('auth/register', {
        title: 'Register - Mustang RideShare',
        error: 'An account with this email already exists.',
        formData: { fullName, email, role },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'student',
    });

    // Auto-login after registration
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // show success page OR just send them to login
    res.render('auth/register-success', {
      title: 'Registration Complete - Mustang RideShare',
      name: user.fullName,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.render('auth/register', {
      title: 'Register - Mustang RideShare',
      error: 'Something went wrong. Please try again.',
      formData: req.body,
    });
  }
});

/* ---------- DASHBOARDS ---------- */

app.get('/dashboard/student', (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'student') return res.status(403).send('Access denied');

  res.render('dashboard/student', {
    title: 'Student Dashboard - Mustang RideShare',
    user: req.user,
  });
});

app.get('/dashboard/driver', (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'driver') return res.status(403).send('Access denied');

  res.render('dashboard/driver', {
    title: 'Driver Dashboard - Mustang RideShare',
    user: req.user,
  });
});

// ✅ Simple "Post New Ride" page for drivers
app.get('/rides/new', (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'driver') return res.status(403).send('Access denied');

  res.render('rides/new', {
    title: 'Post New Ride - Mustang RideShare',
    user: req.user,
  });
});

app.get('/dashboard/admin', (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  res.render('dashboard/admin', {
    title: 'Admin Dashboard - Mustang RideShare',
    user: req.user,
  });
});

/* ---------- API ROUTES ---------- */

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'Mustang RideShare API', version: '1.0.0' });
});

app.use('/api/users', usersRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/messages', messagesRoutes);

/* ---------- ERROR HANDLER ---------- */
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Website + API running on http://localhost:${port}`);
});
