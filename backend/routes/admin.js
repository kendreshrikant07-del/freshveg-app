const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, dbFind, dbFindOne, dbInsert, dbUpdate, dbRemove, dbCount } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/dashboard', async (req, res) => {
  try {
    const allOrders = await dbFind(db.orders, {});
    const activeOrders = allOrders.filter(o => o.status !== 'cancelled');
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalUsers = await dbCount(db.users, { role: 'customer' });
    const totalProducts = await dbCount(db.products, { is_active: true });
    const pendingOrders = allOrders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status)).length;

    const recentOrders = allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
    const recentWithUsers = await Promise.all(recentOrders.map(async o => {
      const user = await dbFindOne(db.users, { _id: o.user_id });
      return { ...o, id: o._id, customer_name: user?.name || 'N/A' };
    }));

    const allProducts = await dbFind(db.products, { is_active: true });
    const topProducts = allProducts.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0)).slice(0, 5);

    res.json({ success: true, stats: { total_revenue: parseFloat(totalRevenue.toFixed(2)), total_orders: allOrders.length, total_users: totalUsers, total_products: totalProducts, pending_orders: pendingOrders }, recent_orders: recentWithUsers, top_products: topProducts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let orders = await dbFind(db.orders, status ? { status } : {});
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = orders.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginated = orders.slice(offset, offset + parseInt(limit));
    const withUsers = await Promise.all(paginated.map(async o => {
      const user = await dbFindOne(db.users, { _id: o.user_id });
      const items = await dbFind(db.orderItems, { order_id: o._id });
      let address = null;
      try { address = o.address_data ? JSON.parse(o.address_data) : null; } catch(e) {}
      return { ...o, id: o._id, customer_name: user?.name || 'N/A', customer_email: user?.email || '', customer_phone: user?.phone || '', address, items };
    }));
    res.json({ success: true, orders: withUsers, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending','confirmed','processing','packed','out_for_delivery','delivered','cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const update = { status, updated_at: new Date().toISOString() };
    if (status === 'delivered') update.delivered_at = new Date().toISOString();
    await dbUpdate(db.orders, { _id: req.params.id }, { $set: update });
    res.json({ success: true, message: 'Status updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/products', async (req, res) => {
  try {
    const products = await dbFind(db.products, {});
    products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, products: products.map(p => ({ ...p, id: p._id })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/products', async (req, res) => {
  try {
    const { category_id, name, description, price, mrp, unit, stock_quantity, origin, freshness_days, is_organic, is_featured } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
    const cat = await dbFindOne(db.categories, { _id: category_id });
    const id = uuidv4();
    await dbInsert(db.products, { _id: id, category_id, category_name: cat?.name || '', category_slug: cat?.slug || '', name, slug, description, price: parseFloat(price), mrp: parseFloat(mrp), discount_percent: Math.round(((mrp - price) / mrp) * 100), unit, stock_quantity: parseFloat(stock_quantity), origin, freshness_days: parseInt(freshness_days) || 3, is_organic: !!is_organic, is_featured: !!is_featured, rating: 4.0, review_count: 0, sold_count: 0, tags: [], is_active: true, created_at: new Date().toISOString() });
    res.status(201).json({ success: true, message: 'Product created', id });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { name, price, mrp, stock_quantity, is_active, is_featured } = req.body;
    await dbUpdate(db.products, { _id: req.params.id }, { $set: { name, price: parseFloat(price), mrp: parseFloat(mrp), discount_percent: Math.round(((mrp - price) / mrp) * 100), stock_quantity: parseFloat(stock_quantity), is_active: !!is_active, is_featured: !!is_featured, updated_at: new Date().toISOString() } });
    res.json({ success: true, message: 'Product updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/products/:id', async (req, res) => {
  await dbUpdate(db.products, { _id: req.params.id }, { $set: { is_active: false } });
  res.json({ success: true, message: 'Product deactivated' });
});

router.get('/users', async (req, res) => {
  try {
    const users = await dbFind(db.users, {});
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json({ success: true, users: users.map(u => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, created_at: u.created_at })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
