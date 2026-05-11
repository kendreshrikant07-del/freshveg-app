const jwt = require('jsonwebtoken');
const { db, dbFindOne } = require('../database/db');
const JWT_SECRET = process.env.JWT_SECRET || 'freshveg_secret';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    try {
      const user = await dbFindOne(db.users, { _id: decoded.id });
      if (!user) return res.status(401).json({ success: false, message: 'User not found' });
      req.user = { id: user._id, name: user.name, email: user.email, role: user.role };
      next();
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (!err) {
      try {
        const user = await dbFindOne(db.users, { _id: decoded.id });
        if (user) req.user = { id: user._id, name: user.name, email: user.email, role: user.role };
      } catch(e) {}
    }
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

module.exports = { authenticateToken, optionalAuth, requireAdmin };
