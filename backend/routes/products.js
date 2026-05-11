const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, dbFind, dbFindOne, dbInsert, dbUpdate, dbCount } = require('../database/db');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await dbFind(db.categories, { is_active: true });
    categories.sort((a, b) => a.sort_order - b.sort_order);
    const catWithCount = await Promise.all(categories.map(async cat => {
      const count = await dbCount(db.products, { category_id: cat._id, is_active: true });
      return { ...cat, id: cat._id, product_count: count };
    }));
    res.json({ success: true, categories: catWithCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get all products with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, sort, min_price, max_price, organic, featured, page = 1, limit = 12 } = req.query;
    let query = { is_active: true };

    if (category) {
      const cat = await dbFindOne(db.categories, { slug: category });
      if (cat) query.category_id = cat._id;
    }
    if (organic === 'true') query.is_organic = true;
    if (featured === 'true') query.is_featured = true;

    let products = await dbFind(db.products, query);

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }

    // Apply price filter
    if (min_price) products = products.filter(p => p.price >= parseFloat(min_price));
    if (max_price) products = products.filter(p => p.price <= parseFloat(max_price));

    // Sort
    const sortFns = {
      'price_asc': (a, b) => a.price - b.price,
      'price_desc': (a, b) => b.price - a.price,
      'rating': (a, b) => b.rating - a.rating,
      'popular': (a, b) => b.sold_count - a.sold_count,
      'discount': (a, b) => b.discount_percent - a.discount_percent,
      'newest': (a, b) => new Date(b.created_at) - new Date(a.created_at),
    };
    if (sortFns[sort]) products.sort(sortFns[sort]);
    else products.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || b.rating - a.rating);

    const total = products.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginated = products.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      products: paginated.map(p => ({ ...p, id: p._id })),
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get featured products
router.get('/featured', async (req, res) => {
  try {
    const products = await dbFind(db.products, { is_featured: true, is_active: true });
    products.sort((a, b) => b.rating - a.rating);
    res.json({ success: true, products: products.slice(0, 8).map(p => ({ ...p, id: p._id })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Get single product by slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const product = await dbFindOne(db.products, { slug: req.params.slug, is_active: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const reviews = await dbFind(db.reviews, { product_id: product._id });
    reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Attach user names to reviews
    const reviewsWithNames = await Promise.all(reviews.slice(0, 20).map(async r => {
      const user = await dbFindOne(db.users, { _id: r.user_id });
      return { ...r, user_name: user?.name || 'Customer' };
    }));

    const related = await dbFind(db.products, { category_id: product.category_id, is_active: true });
    const filteredRelated = related.filter(p => p._id !== product._id).slice(0, 6);

    let is_wishlisted = false;
    if (req.user) {
      const w = await dbFindOne(db.wishlist, { user_id: req.user.id, product_id: product._id });
      is_wishlisted = !!w;
    }

    res.json({
      success: true,
      product: { ...product, id: product._id, is_wishlisted },
      reviews: reviewsWithNames,
      related: filteredRelated.map(p => ({ ...p, id: p._id }))
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Add review
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, title, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be 1-5' });
    const existing = await dbFindOne(db.reviews, { product_id: req.params.id, user_id: req.user.id });
    const reviewData = { product_id: req.params.id, user_id: req.user.id, rating: parseInt(rating), title: title || '', comment: comment || '', created_at: new Date().toISOString() };
    if (existing) {
      await dbUpdate(db.reviews, { _id: existing._id }, { $set: reviewData });
    } else {
      await dbInsert(db.reviews, { _id: uuidv4(), ...reviewData });
    }
    // Recalculate rating
    const allReviews = await dbFind(db.reviews, { product_id: req.params.id });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await dbUpdate(db.products, { _id: req.params.id }, { $set: { rating: parseFloat(avgRating.toFixed(1)), review_count: allReviews.length } });
    res.status(201).json({ success: true, message: 'Review submitted!' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
