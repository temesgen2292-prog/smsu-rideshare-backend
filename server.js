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
const session = require('express-session'); // <--- NEW: Required for login

// Import Routes
const authRoutes = require('./routes/auth.routes'); // <--- NEW: Your auth logic
const usersRoutes = require('./routes/users');
const ridesRoutes = require('./routes/rides');
const messagesRoutes = require('./routes/messages');

dotenv.config();
const { connectDB } = require('./config/db');

connectDB();

const app = express();

/* ---------- VIEW ENGINE: EJS ---------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ---------- STATIC FILES ---------- */
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- SECURITY / CORE MIDDLEWARE ---------- */
app.use(helmet({
  contentSecurityPolicy: false, // Disabled briefly to allow inline scripts/images for dev
}));
app.use(cors({ origin: true, credentials: true }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
);
app.use(hpp());
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

/* ---------- SESSION CONFIGURATION (NEW) ---------- */
// This allows the server to "remember" the user after they login
app.use(session({
  secret: process.env.SESSION_SECRET || 'mysecretkey', // Make sure this is in your .env
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24 // Session lasts 1 day
  }
}));

/* ---------- GLOBAL VARIABLES MIDDLEWARE (NEW) ---------- */
// This makes 'user' and 'isLoggedIn' available in ALL EJS files (Navbar, etc.)
app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn || false;
  res.locals.user = req.session.user || null;
  next();
});

/* ---------- WEB PAGES & AUTH ROUTES ---------- */

// Home page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Mustang RideShare',
    subtitle: 'Share rides. Save money. Stay connected as Mustangs.'
  });
});

// Use the Auth Routes we created (handles /login, /register, /verify)
app.use(authRoutes); 

// Protected Dashboard Routes 
// (We check if user exists in session)
app.get('/dashboard/student', (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');
  res.render('dashboard/student', { title: 'Student Dashboard' });
});

app.get('/dashboard/driver', (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');
  res.render('dashboard/driver', { title: 'Driver Dashboard' });
});

app.get('/dashboard/admin', (req, res) => {
  if (!req.session.isLoggedIn) return res.redirect('/login');
  res.render('dashboard/admin', { title: 'Admin Dashboard' });
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