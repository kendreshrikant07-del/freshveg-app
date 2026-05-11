const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, dbFind, dbFindOne, dbInsert, dbUpdate, dbRemove, dbCount } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const cartItems = await dbFind(db.cart, { user_id: req.user.id });
    const items = await Promise.all(cartItems.map(async item => {
      const product = await dbFindOne(db.products, { _id: item.product_id });
      if (!product) return null;
      return { ...item, id: item._id, product_id: product._id, name: product.name, slug: product.slug, price: product.price, mrp: product.mrp, discount_percent: product.discount_percent, unit: product.unit, image: product.image, stock_quantity: product.stock_quantity, is_active: product.is_active };
    }));
    const validItems = items.filter(Boolean);
    const subtotal = validItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const savings = validItems.reduce((sum, i) => sum + ((i.mrp - i.price) * i.quantity), 0);
    res.json({
      success: true, items: validItems,
      summary: { item_count: validItems.length, total_quantity: validItems.reduce((s, i) => s + i.quantity, 0), subtotal: parseFloat(subtotal.toFixed(2)), savings: parseFloat(savings.toFixed(2)), delivery_fee: subtotal >= 500 ? 0 : 40, total: parseFloat((subtotal + (subtotal >= 500 ? 0 : 40)).toFixed(2)) }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Add to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ success: false, message: 'Product ID required' });
    const product = await dbFindOne(db.products, { _id: product_id, is_active: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.stock_quantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
    const existing = await dbFindOne(db.cart, { user_id: req.user.id, product_id });
    if (existing) {
      await dbUpdate(db.cart, { _id: existing._id }, { $set: { quantity: existing.quantity + quantity } });
    } else {
      await dbInsert(db.cart, { _id: uuidv4(), user_id: req.user.id, product_id, quantity, added_at: new Date().toISOString() });
    }
    const count = await dbCount(db.cart, { user_id: req.user.id });
    res.json({ success: true, message: 'Added to cart', cart_count: count });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Update quantity
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    if (quantity <= 0) {
      await dbRemove(db.cart, { user_id: req.user.id, product_id });
      return res.json({ success: true, message: 'Item removed' });
    }
    const product = await dbFindOne(db.products, { _id: product_id });
    if (!product || product.stock_quantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });
    await dbUpdate(db.cart, { user_id: req.user.id, product_id }, { $set: { quantity } });
    res.json({ success: true, message: 'Cart updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Remove
router.delete('/remove/:productId', authenticateToken, async (req, res) => {
  await dbRemove(db.cart, { user_id: req.user.id, product_id: req.params.productId });
  res.json({ success: true, message: 'Removed from cart' });
});

// Clear
router.delete('/clear', authenticateToken, async (req, res) => {
  await dbRemove(db.cart, { user_id: req.user.id }, { multi: true });
  res.json({ success: true, message: 'Cart cleared' });
});

// Apply coupon
router.post('/apply-coupon', authenticateToken, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const coupon = await dbFindOne(db.coupons, { code: code.toUpperCase(), is_active: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    if (subtotal < coupon.min_order_amount) return res.status(400).json({ success: false, message: `Minimum order ₹${coupon.min_order_amount} required` });
    let discount = coupon.discount_type === 'percent' ? (subtotal * coupon.discount_value) / 100 : coupon.discount_value;
    if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
    res.json({ success: true, message: 'Coupon applied!', discount: parseFloat(discount.toFixed(2)), coupon_code: coupon.code });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Wishlist
router.get('/wishlist', authenticateToken, async (req, res) => {
  try {
    const items = await dbFind(db.wishlist, { user_id: req.user.id });
    const enriched = await Promise.all(items.map(async item => {
      const product = await dbFindOne(db.products, { _id: item.product_id });
      if (!product) return null;
      return { ...item, product_id: product._id, name: product.name, slug: product.slug, price: product.price, mrp: product.mrp, discount_percent: product.discount_percent, unit: product.unit, rating: product.rating };
    }));
    res.json({ success: true, items: enriched.filter(Boolean) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/wishlist/toggle', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;
    const existing = await dbFindOne(db.wishlist, { user_id: req.user.id, product_id });
    if (existing) {
      await dbRemove(db.wishlist, { _id: existing._id });
      res.json({ success: true, wishlisted: false, message: 'Removed from wishlist' });
    } else {
      await dbInsert(db.wishlist, { _id: uuidv4(), user_id: req.user.id, product_id, added_at: new Date().toISOString() });
      res.json({ success: true, wishlisted: true, message: 'Added to wishlist' });
    }
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
