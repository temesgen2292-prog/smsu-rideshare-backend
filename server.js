const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');

dotenv.config();
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const usersRoutes = require('./routes/users');
const ridesRoutes = require('./routes/rides');
const messagesRoutes = require('./routes/messages');

const app = express();
connectDB();

// security & middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(xss());
app.use(hpp());
app.use(compression());

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ ok: true, name: 'SMSU RideShare API', version: '1.0.0' });
});

// API routes
app.use('/api/users', usersRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/messages', messagesRoutes);

// error handler (last)
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));

