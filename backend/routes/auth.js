const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db, dbFind, dbFindOne, dbInsert, dbUpdate, dbRemove } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'freshveg_secret';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const existing = await dbFindOne(db.users, { email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const user = { _id: id, name, email, password: hashedPassword, phone: phone || null, role: 'customer', created_at: new Date().toISOString() };
    await dbInsert(db.users, user);
    const token = jwt.sign({ id, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, message: 'Registration successful', token, user: { id, name, email, phone, role: 'customer' } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await dbFindOne(db.users, { email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Login successful', token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/profile', authenticateToken, async (req, res) => {
  const user = await dbFindOne(db.users, { _id: req.user.id });
  const addresses = await dbFind(db.addresses, { user_id: req.user.id });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    addresses: addresses.map(a => ({ ...a, id: a._id }))
  });

});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await dbUpdate(db.users, { _id: req.user.id }, { $set: { name, phone, updated_at: new Date().toISOString() } });
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await dbFindOne(db.users, { _id: req.user.id });
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await dbUpdate(db.users, { _id: req.user.id }, { $set: { password: hashed } });
    res.json({ success: true, message: 'Password changed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/addresses', authenticateToken, async (req, res) => {
  try {
    const { label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;
    if (is_default) await dbUpdate(db.addresses, { user_id: req.user.id }, { $set: { is_default: false } }, { multi: true });
    const id = uuidv4();
    await dbInsert(db.addresses, { _id: id, user_id: req.user.id, label: label || 'Home', full_name, phone, address_line1, address_line2: address_line2 || '', city, state, pincode, is_default: !!is_default, created_at: new Date().toISOString() });
    res.status(201).json({ success: true, message: 'Address added', id });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/addresses/:id', authenticateToken, async (req, res) => {
  await dbRemove(db.addresses, { _id: req.params.id, user_id: req.user.id });
  res.json({ success: true, message: 'Address deleted' });
});

module.exports = router;
