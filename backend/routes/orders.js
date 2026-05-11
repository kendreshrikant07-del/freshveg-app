const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, dbFind, dbFindOne, dbInsert, dbUpdate, dbRemove, dbCount } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Place order
router.post('/place', authenticateToken, async (req, res) => {
  try {
    const { address_id, payment_method = 'cod', coupon_code, notes } = req.body;
    const address = await dbFindOne(db.addresses, { _id: address_id, user_id: req.user.id });
    if (!address) return res.status(400).json({ success: false, message: 'Invalid address' });

    const cartItems = await dbFind(db.cart, { user_id: req.user.id });
    if (!cartItems.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

    const enriched = await Promise.all(cartItems.map(async item => {
      const p = await dbFindOne(db.products, { _id: item.product_id });
      return { ...item, product: p };
    }));

    for (const item of enriched) {
      if (!item.product || item.product.stock_quantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${item.product?.name || 'product'}` });
      }
    }

    const subtotal = enriched.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const delivery_fee = subtotal >= 500 ? 0 : 40;
    let discount_amount = 0;

    if (coupon_code) {
      const coupon = await dbFindOne(db.coupons, { code: coupon_code.toUpperCase(), is_active: true });
      if (coupon && subtotal >= coupon.min_order_amount) {
        discount_amount = coupon.discount_type === 'percent'
          ? Math.min((subtotal * coupon.discount_value) / 100, coupon.max_discount || Infinity)
          : coupon.discount_value;
      }
    }

    const total_amount = parseFloat((subtotal + delivery_fee - discount_amount).toFixed(2));
    const order_number = `FV${Date.now().toString().slice(-8)}`;
    const order_id = uuidv4();
    const estimated_delivery = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    await dbInsert(db.orders, {
      _id: order_id, user_id: req.user.id, order_number,
      status: 'pending', subtotal, delivery_fee, discount_amount,
      coupon_code: coupon_code || null, total_amount,
      address_data: JSON.stringify(address), payment_method, payment_status: 'pending',
      notes: notes || null, estimated_delivery, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });

    for (const item of enriched) {
      await dbInsert(db.orderItems, {
        _id: uuidv4(), order_id, product_id: item.product._id,
        product_name: item.product.name, quantity: item.quantity,
        unit: item.product.unit, price: item.product.price, mrp: item.product.mrp,
        subtotal: item.product.price * item.quantity
      });
      await dbUpdate(db.products, { _id: item.product._id }, {
        $set: {
          stock_quantity: item.product.stock_quantity - item.quantity,
          sold_count: (item.product.sold_count || 0) + item.quantity
        }
      });
    }

    await dbRemove(db.cart, { user_id: req.user.id }, { multi: true });
    res.status(201).json({ success: true, message: 'Order placed successfully!', order_id, order_number, total_amount, estimated_delivery });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get user orders
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const orders = await dbFind(db.orders, { user_id: req.user.id });
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = orders.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginated = orders.slice(offset, offset + parseInt(limit));

    const withItems = await Promise.all(paginated.map(async o => {
      const items = await dbFind(db.orderItems, { order_id: o._id });
      const items_summary = items.map(i => i.product_name).join(', ');
      return { ...o, id: o._id, items_summary };
    }));

    res.json({ success: true, orders: withItems, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get single order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await dbFindOne(db.orders, { _id: req.params.id, user_id: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const items = await dbFind(db.orderItems, { order_id: order._id });
    res.json({ success: true, order: { ...order, id: order._id, address: JSON.parse(order.address_data), items } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Cancel order
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const order = await dbFindOne(db.orders, { _id: req.params.id, user_id: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!['pending', 'confirmed'].includes(order.status)) return res.status(400).json({ success: false, message: 'Cannot cancel at this stage' });
    await dbUpdate(db.orders, { _id: order._id }, { $set: { status: 'cancelled', updated_at: new Date().toISOString() } });
    const items = await dbFind(db.orderItems, { order_id: order._id });
    for (const item of items) {
      const product = await dbFindOne(db.products, { _id: item.product_id });
      if (product) await dbUpdate(db.products, { _id: item.product_id }, { $set: { stock_quantity: product.stock_quantity + item.quantity } });
    }
    res.json({ success: true, message: 'Order cancelled' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
