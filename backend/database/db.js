const Datastore = require('@seald-io/nedb');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_DIR = path.join(__dirname);

// Create datastores
const db = {
  users: new Datastore({ filename: path.join(DB_DIR, 'users.db'), autoload: true }),
  categories: new Datastore({ filename: path.join(DB_DIR, 'categories.db'), autoload: true }),
  products: new Datastore({ filename: path.join(DB_DIR, 'products.db'), autoload: true }),
  cart: new Datastore({ filename: path.join(DB_DIR, 'cart.db'), autoload: true }),
  orders: new Datastore({ filename: path.join(DB_DIR, 'orders.db'), autoload: true }),
  orderItems: new Datastore({ filename: path.join(DB_DIR, 'order_items.db'), autoload: true }),
  addresses: new Datastore({ filename: path.join(DB_DIR, 'addresses.db'), autoload: true }),
  reviews: new Datastore({ filename: path.join(DB_DIR, 'reviews.db'), autoload: true }),
  wishlist: new Datastore({ filename: path.join(DB_DIR, 'wishlist.db'), autoload: true }),
  coupons: new Datastore({ filename: path.join(DB_DIR, 'coupons.db'), autoload: true }),
};

// Promisify nedb methods
function dbFind(store, query = {}, sort = {}) {
  return new Promise((resolve, reject) => {
    store.find(query).sort(sort).exec((err, docs) => err ? reject(err) : resolve(docs));
  });
}
function dbFindOne(store, query) {
  return new Promise((resolve, reject) => {
    store.findOne(query, (err, doc) => err ? reject(err) : resolve(doc));
  });
}
function dbInsert(store, doc) {
  return new Promise((resolve, reject) => {
    store.insert(doc, (err, newDoc) => err ? reject(err) : resolve(newDoc));
  });
}
function dbUpdate(store, query, update, options = {}) {
  return new Promise((resolve, reject) => {
    store.update(query, update, options, (err, n) => err ? reject(err) : resolve(n));
  });
}
function dbRemove(store, query, options = {}) {
  return new Promise((resolve, reject) => {
    store.remove(query, options, (err, n) => err ? reject(err) : resolve(n));
  });
}
function dbCount(store, query = {}) {
  return new Promise((resolve, reject) => {
    store.count(query, (err, n) => err ? reject(err) : resolve(n));
  });
}

async function initializeDatabase() {
  console.log('✅ NeDB database initialized');
  await seedData();
}

async function seedData() {
  const count = await dbCount(db.categories);
  if (count > 0) { console.log('✅ Data already seeded'); return; }

  // Seed categories
  const categories = [
    { _id: uuidv4(), name: 'Leafy Greens', slug: 'leafy-greens', description: 'Fresh leafy vegetables', icon: '🥬', sort_order: 1, is_active: true },
    { _id: uuidv4(), name: 'Root Vegetables', slug: 'root-vegetables', description: 'Nutritious underground vegetables', icon: '🥕', sort_order: 2, is_active: true },
    { _id: uuidv4(), name: 'Gourds & Squash', slug: 'gourds-squash', description: 'Fresh gourds', icon: '🎃', sort_order: 3, is_active: true },
    { _id: uuidv4(), name: 'Tomatoes & Peppers', slug: 'tomatoes-peppers', description: 'Fresh tomatoes & peppers', icon: '🍅', sort_order: 4, is_active: true },
    { _id: uuidv4(), name: 'Onions & Garlic', slug: 'onions-garlic', description: 'Aromatic onions & garlic', icon: '🧅', sort_order: 5, is_active: true },
    { _id: uuidv4(), name: 'Exotic Vegetables', slug: 'exotic-vegetables', description: 'Premium & exotic varieties', icon: '🥦', sort_order: 6, is_active: true },
    { _id: uuidv4(), name: 'Fresh Herbs', slug: 'fresh-herbs', description: 'Aromatic fresh herbs', icon: '🌿', sort_order: 7, is_active: true },
    { _id: uuidv4(), name: 'Mushrooms', slug: 'mushrooms', description: 'Fresh mushrooms', icon: '🍄', sort_order: 8, is_active: true },
  ];
  for (const cat of categories) await dbInsert(db.categories, cat);
  const catMap = {};
  categories.forEach(c => catMap[c.slug] = c._id);

  // Seed products
  const products = [
    { catSlug: 'leafy-greens', name: 'Spinach (Palak)', price: 25, mrp: 30, unit: 'bunch', stock: 200, freshness: 3, organic: true, featured: true, rating: 4.5, reviews: 128, desc: 'Farm-fresh spinach packed with iron and vitamins. Perfect for curries and smoothies.', origin: 'Maharashtra' },
    { catSlug: 'leafy-greens', name: 'Fenugreek (Methi)', price: 15, mrp: 20, unit: 'bunch', stock: 150, freshness: 2, organic: false, featured: false, rating: 4.3, reviews: 89, desc: 'Fresh methi leaves with slightly bitter taste. Great for parathas and dal.', origin: 'Rajasthan' },
    { catSlug: 'leafy-greens', name: 'Coriander (Dhaniya)', price: 10, mrp: 15, unit: 'bunch', stock: 300, freshness: 2, organic: false, featured: true, rating: 4.6, reviews: 210, desc: 'Fresh aromatic coriander. Essential for garnishing all Indian dishes.', origin: 'Punjab' },
    { catSlug: 'leafy-greens', name: 'Mint (Pudina)', price: 12, mrp: 15, unit: 'bunch', stock: 180, freshness: 2, organic: true, featured: false, rating: 4.4, reviews: 95, desc: 'Fresh aromatic mint leaves. Perfect for chutneys and raita.', origin: 'Uttar Pradesh' },
    { catSlug: 'leafy-greens', name: 'Lettuce', price: 45, mrp: 55, unit: 'head', stock: 80, freshness: 4, organic: true, featured: false, rating: 4.2, reviews: 67, desc: 'Crisp iceberg lettuce. Perfect for salads and sandwiches.', origin: 'Himachal Pradesh' },
    { catSlug: 'root-vegetables', name: 'Carrot (Gajar)', price: 40, mrp: 50, unit: 'kg', stock: 150, freshness: 7, organic: false, featured: true, rating: 4.7, reviews: 156, desc: 'Fresh crunchy carrots rich in beta-carotene. Great for juices and cooking.', origin: 'Himachal Pradesh' },
    { catSlug: 'root-vegetables', name: 'Potato (Aloo)', price: 30, mrp: 35, unit: 'kg', stock: 500, freshness: 15, organic: false, featured: true, rating: 4.5, reviews: 320, desc: 'Fresh farm potatoes. The most versatile vegetable for Indian cooking.', origin: 'Uttar Pradesh' },
    { catSlug: 'root-vegetables', name: 'Radish (Mooli)', price: 20, mrp: 25, unit: 'bunch', stock: 120, freshness: 5, organic: false, featured: false, rating: 4.1, reviews: 78, desc: 'Fresh white radish with crisp texture and peppery flavor.', origin: 'Punjab' },
    { catSlug: 'root-vegetables', name: 'Beetroot', price: 35, mrp: 45, unit: 'kg', stock: 100, freshness: 10, organic: true, featured: false, rating: 4.4, reviews: 112, desc: 'Deep red beetroot rich in antioxidants. Excellent for juices and salads.', origin: 'Maharashtra' },
    { catSlug: 'root-vegetables', name: 'Sweet Potato', price: 45, mrp: 55, unit: 'kg', stock: 90, freshness: 14, organic: false, featured: false, rating: 4.3, reviews: 88, desc: 'Naturally sweet and nutritious. Rich in fiber and minerals.', origin: 'Odisha' },
    { catSlug: 'gourds-squash', name: 'Bottle Gourd (Lauki)', price: 25, mrp: 30, unit: 'piece', stock: 200, freshness: 5, organic: false, featured: false, rating: 4.2, reviews: 145, desc: 'Fresh tender lauki. Low in calories, great for curries and juices.', origin: 'Maharashtra' },
    { catSlug: 'gourds-squash', name: 'Bitter Gourd (Karela)', price: 30, mrp: 40, unit: 'kg', stock: 100, freshness: 5, organic: false, featured: false, rating: 3.9, reviews: 98, desc: 'Fresh bitter gourd known for blood sugar management.', origin: 'Tamil Nadu' },
    { catSlug: 'tomatoes-peppers', name: 'Tomato', price: 35, mrp: 45, unit: 'kg', stock: 300, freshness: 5, organic: false, featured: true, rating: 4.6, reviews: 289, desc: 'Fresh ripe tomatoes full of lycopene and vitamin C. Kitchen essential.', origin: 'Andhra Pradesh' },
    { catSlug: 'tomatoes-peppers', name: 'Green Chilli (Hari Mirch)', price: 20, mrp: 25, unit: '250g', stock: 200, freshness: 5, organic: false, featured: false, rating: 4.5, reviews: 178, desc: 'Fresh spicy green chillies. Essential for authentic Indian cooking.', origin: 'Andhra Pradesh' },
    { catSlug: 'tomatoes-peppers', name: 'Capsicum (Bell Pepper)', price: 60, mrp: 75, unit: 'kg', stock: 120, freshness: 7, organic: true, featured: true, rating: 4.5, reviews: 134, desc: 'Crisp colorful capsicum. Rich in vitamin C and antioxidants.', origin: 'Himachal Pradesh' },
    { catSlug: 'tomatoes-peppers', name: 'Cherry Tomatoes', price: 80, mrp: 100, unit: '500g', stock: 80, freshness: 5, organic: true, featured: true, rating: 4.7, reviews: 112, desc: 'Sweet and juicy cherry tomatoes. Perfect for salads and pasta.', origin: 'Maharashtra' },
    { catSlug: 'onions-garlic', name: 'Onion (Pyaz)', price: 30, mrp: 40, unit: 'kg', stock: 500, freshness: 20, organic: false, featured: true, rating: 4.5, reviews: 445, desc: 'Fresh red onions. Essential ingredient in all Indian cooking.', origin: 'Nashik, Maharashtra' },
    { catSlug: 'onions-garlic', name: 'Garlic (Lehsun)', price: 120, mrp: 150, unit: 'kg', stock: 200, freshness: 30, organic: false, featured: false, rating: 4.7, reviews: 267, desc: 'Fresh aromatic garlic. Excellent for immunity and cooking.', origin: 'Gujarat' },
    { catSlug: 'onions-garlic', name: 'Ginger (Adrak)', price: 80, mrp: 100, unit: 'kg', stock: 150, freshness: 15, organic: false, featured: false, rating: 4.6, reviews: 198, desc: 'Fresh ginger root. Excellent for digestion and immunity.', origin: 'Kerala' },
    { catSlug: 'exotic-vegetables', name: 'Broccoli', price: 80, mrp: 100, unit: 'piece', stock: 80, freshness: 4, organic: true, featured: true, rating: 4.6, reviews: 189, desc: 'Fresh organic broccoli. Superfood packed with vitamins C and K.', origin: 'Himachal Pradesh' },
    { catSlug: 'exotic-vegetables', name: 'Zucchini', price: 60, mrp: 75, unit: 'kg', stock: 60, freshness: 5, organic: true, featured: false, rating: 4.3, reviews: 78, desc: 'Fresh tender zucchini. Low calories, perfect for Italian cooking.', origin: 'Maharashtra' },
    { catSlug: 'exotic-vegetables', name: 'Baby Corn', price: 50, mrp: 65, unit: '250g', stock: 100, freshness: 3, organic: false, featured: false, rating: 4.4, reviews: 134, desc: 'Tender baby corn for stir-fries and soups. Crunchy and sweet.', origin: 'Tamil Nadu' },
    { catSlug: 'exotic-vegetables', name: 'Asparagus', price: 150, mrp: 180, unit: '250g', stock: 40, freshness: 3, organic: true, featured: true, rating: 4.8, reviews: 56, desc: 'Premium fresh asparagus. Rich in folate and vitamins. Gourmet vegetable.', origin: 'Himachal Pradesh' },
    { catSlug: 'fresh-herbs', name: 'Basil', price: 30, mrp: 40, unit: 'bunch', stock: 80, freshness: 3, organic: true, featured: false, rating: 4.5, reviews: 89, desc: 'Fresh aromatic basil leaves. Perfect for Italian recipes and pesto.', origin: 'Himachal Pradesh' },
    { catSlug: 'fresh-herbs', name: 'Curry Leaves (Kadi Patta)', price: 10, mrp: 15, unit: 'bunch', stock: 200, freshness: 5, organic: false, featured: false, rating: 4.7, reviews: 312, desc: 'Fresh curry leaves essential for South Indian cooking.', origin: 'Tamil Nadu' },
    { catSlug: 'mushrooms', name: 'Button Mushroom', price: 80, mrp: 100, unit: '200g', stock: 100, freshness: 3, organic: false, featured: true, rating: 4.5, reviews: 145, desc: 'Fresh white button mushrooms. Rich in protein and B vitamins.', origin: 'Himachal Pradesh' },
    { catSlug: 'mushrooms', name: 'Oyster Mushroom', price: 120, mrp: 150, unit: '200g', stock: 60, freshness: 3, organic: true, featured: true, rating: 4.7, reviews: 89, desc: 'Premium oyster mushrooms. High in protein, fiber and antioxidants.', origin: 'Uttarakhand' },
  ];

  for (const p of products) {
    const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await dbInsert(db.products, {
      _id: uuidv4(),
      category_id: catMap[p.catSlug],
      category_name: categories.find(c => c.slug === p.catSlug)?.name || '',
      category_slug: p.catSlug,
      name: p.name, slug, description: p.desc, short_description: p.desc,
      price: p.price, mrp: p.mrp, discount_percent: discount,
      unit: p.unit, stock_quantity: p.stock, freshness_days: p.freshness,
      is_organic: p.organic, is_featured: p.featured,
      rating: p.rating, review_count: p.reviews, sold_count: 0,
      origin: p.origin, tags: [], is_active: true,
      created_at: new Date().toISOString(),
    });
  }

  // Admin user
  const adminPwd = await bcrypt.hash('admin123', 10);
  await dbInsert(db.users, { _id: uuidv4(), name: 'Admin User', email: 'admin@freshveg.com', password: adminPwd, phone: '9999999999', role: 'admin', created_at: new Date().toISOString() });

  // Demo user
  const userPwd = await bcrypt.hash('user123', 10);
  await dbInsert(db.users, { _id: uuidv4(), name: 'Demo User', email: 'user@freshveg.com', password: userPwd, phone: '8888888888', role: 'customer', created_at: new Date().toISOString() });

  // Coupons
  await dbInsert(db.coupons, { _id: uuidv4(), code: 'FRESH10', discount_type: 'percent', discount_value: 10, min_order_amount: 100, max_discount: 50, is_active: true });
  await dbInsert(db.coupons, { _id: uuidv4(), code: 'NEWUSER', discount_type: 'percent', discount_value: 20, min_order_amount: 200, max_discount: 100, is_active: true });
  await dbInsert(db.coupons, { _id: uuidv4(), code: 'FLAT50', discount_type: 'flat', discount_value: 50, min_order_amount: 500, max_discount: 50, is_active: true });
  await dbInsert(db.coupons, { _id: uuidv4(), code: 'SAVE100', discount_type: 'flat', discount_value: 100, min_order_amount: 1000, max_discount: 100, is_active: true });

  console.log('✅ Seed data inserted successfully');
}

module.exports = { db, dbFind, dbFindOne, dbInsert, dbUpdate, dbRemove, dbCount, initializeDatabase };
