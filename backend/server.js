const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB connection with retry logic
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/writeitdown';

const connectWithRetry = () => {
  console.log('🔗 Attempting to connect to MongoDB...');
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

connectWithRetry();

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: statusMap[dbStatus] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Basic test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// API routes - with error handling for missing routes
try {
  app.use('/api/auth', require('./routes/auth'));
} catch (err) {
  console.error('❌ Auth route loading failed:', err);
  app.use('/api/auth', (req, res) => {
    res.status(500).json({ message: 'Auth routes not available' });
  });
}

try {
  app.use('/api/entries', require('./routes/entries'));
} catch (err) {
  console.error('❌ Entries route loading failed:', err);
  app.use('/api/entries', (req, res) => {
    res.status(500).json({ message: 'Entries routes not available' });
  });
}

try {
  app.use('/api/users', require('./routes/users'));
} catch (err) {
  console.error('❌ Users route loading failed:', err);
  app.use('/api/users', (req, res) => {
    res.status(500).json({ message: 'Users routes not available' });
  });
}

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;

// Export the app for testing
if (require.main === module) {
  // Start server only when this file is run directly
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️ MongoDB URI: ${MONGODB_URI}`);
  });
} else {
  // Export for testing
  module.exports = app;
}