require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const { initializeDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize DB
initializeDatabase();

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🌱 FreshVeg API is running!', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Serve frontend for all non-API routes (SPA support)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  // Get local network IP
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIP = 'YOUR_PC_IP';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log(`\n🚀 FreshVeg Server running!`);
  console.log(`\n💻 On this PC    → http://localhost:${PORT}`);
  console.log(`📱 On Mobile     → http://${localIP}:${PORT}   ← Open this on your phone!`);
  console.log(`\n   Make sure your phone is on the SAME WiFi as this PC.`);
  console.log(`\n👤 Demo Accounts:`);
  console.log(`   Admin: admin@freshveg.com / admin123`);
  console.log(`   User:  user@freshveg.com  / user123\n`);
});

module.exports = app;
