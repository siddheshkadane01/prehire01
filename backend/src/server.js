const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const candidateRoutes = require('./routes/candidate');
const recruiterRoutes = require('./routes/recruiter');
const uploadRoutes = require('./routes/upload');
const linkedinRoutes = require('./routes/linkedin');
const socialAuthRoutes = require('./routes/social-auth');
const jobRoutes = require('./routes/jobs');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const tenantRoutes = require('./routes/tenant');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

// Rate limiting
app.use('/api/', rateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Middleware
// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', linkedinRoutes);
app.use('/api/auth', socialAuthRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prehire';
mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`MongoDB connected: ${mongoUri}`);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// Simple DB health endpoint
app.get('/api/health/db', async (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
      status: states[state] || 'unknown',
      readyState: state,
      uri: process.env.NODE_ENV === 'production' ? undefined : mongoUri,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Prefer BACKEND_PORT to avoid conflicts with global PORT on Windows/dev tools
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});