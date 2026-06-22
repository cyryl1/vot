require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/db');

// Connect to Database and get Client Promise for MongoStore
const clientPromise = connectDB().then(() => {
  const { seedDefaultAdmin } = require('./controllers/adminController');
  seedDefaultAdmin();
  return mongoose.connection.getClient();
});

const app = express();

// Middleware
app.set('trust proxy', 1);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fyb-voting-super-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      clientPromise: clientPromise,
      collectionName: 'sessions'
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || false,
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none'
    },
  })
);

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/voters', require('./routes/voterRoutes'));

// Simple root route for Vercel deployment check
app.get('/', (req, res) => {
  res.json({ message: 'VOT API is running on Vercel!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
