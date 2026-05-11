/* ============================================================
   API Client - Centralized fetch wrapper
   ============================================================ */
const RENDER_URL = 'https://freshveg-app.onrender.com';
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : `${RENDER_URL}/api`;

// Show a wake-up banner when server is starting
function showWakeUpBanner() {
  let banner = document.getElementById('wakeup-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'wakeup-banner';
    banner.style.cssText = `
      position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      background:#1a7f37;color:white;padding:12px 24px;border-radius:50px;
      font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);
      display:flex;align-items:center;gap:10px;
    `;
    banner.innerHTML = `<span style="font-size:20px">🥦</span> Server is waking up... Please wait (30s)`;
    document.body.appendChild(banner);
  }
}
function hideWakeUpBanner() {
  const banner = document.getElementById('wakeup-banner');
  if (banner) banner.remove();
}

const api = {
  async request(method, endpoint, data = null, retries = 2) {
    const token = localStorage.getItem('fv_token');
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data && method !== 'GET') opts.body = JSON.stringify(data);

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) showWakeUpBanner();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout
        const res = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(timeoutId);
        hideWakeUpBanner();
        const json = await res.json();
        return { ok: res.ok, status: res.status, data: json };
      } catch (err) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 3000)); // wait 3s before retry
          continue;
        }
        hideWakeUpBanner();
        return { ok: false, status: 0, data: { success: false, message: 'Server is starting up. Please refresh in 30 seconds.' } };
      }
    }
  },

  get: (endpoint) => api.request('GET', endpoint),
  post: (endpoint, data) => api.request('POST', endpoint, data),
  put: (endpoint, data) => api.request('PUT', endpoint, data),
  delete: (endpoint) => api.request('DELETE', endpoint),
};

// Toast notification system
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || '📢'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Format currency
function formatCurrency(amount) {
  return '₹' + parseFloat(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Format datetime
function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Get order status badge
function getStatusBadge(status) {
  const map = {
    'pending': { label: '⏳ Pending', color: '#f59e0b' },
    'confirmed': { label: '✅ Confirmed', color: '#3b82f6' },
    'processing': { label: '⚙️ Processing', color: '#8b5cf6' },
    'packed': { label: '📦 Packed', color: '#06b6d4' },
    'out_for_delivery': { label: '🚴 Out for Delivery', color: '#f97316' },
    'delivered': { label: '🎉 Delivered', color: '#22c55e' },
    'cancelled': { label: '❌ Cancelled', color: '#ef4444' },
  };
  const s = map[status] || { label: status, color: '#6b7280' };
  return `<span style="background:${s.color}20;color:${s.color};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600">${s.label}</span>`;
}

// Generate star rating HTML
function renderStars(rating, size = 14) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) stars += `<span style="color:#d97706;font-size:${size}px">★</span>`;
    else if (i === full && half) stars += `<span style="color:#d97706;font-size:${size}px">½</span>`;
    else stars += `<span style="color:#d1d5db;font-size:${size}px">★</span>`;
  }
  return stars;
}

// Veggie emoji map
const veggieEmojis = {
  'spinach': '🥬', 'palak': '🥬', 'fenugreek': '🌿', 'methi': '🌿',
  'coriander': '🌿', 'mint': '🌱', 'lettuce': '🥗', 'carrot': '🥕',
  'potato': '🥔', 'aloo': '🥔', 'radish': '🫛', 'beetroot': '🟣',
  'sweet potato': '🍠', 'lauki': '🥒', 'bottle gourd': '🥒',
  'bitter gourd': '🥒', 'karela': '🥒', 'ridge gourd': '🥒',
  'turai': '🥒', 'tomato': '🍅', 'green chilli': '🌶️', 'capsicum': '🫑',
  'bell pepper': '🫑', 'cherry tomato': '🍅', 'onion': '🧅', 'pyaz': '🧅',
  'garlic': '🧄', 'lehsun': '🧄', 'ginger': '🫚', 'adrak': '🫚',
  'broccoli': '🥦', 'zucchini': '🥒', 'baby corn': '🌽', 'asparagus': '🌿',
  'basil': '🌿', 'curry leaves': '🌿', 'mushroom': '🍄',
  'button mushroom': '🍄', 'oyster mushroom': '🍄',
};

function getVeggieEmoji(name) {
  if (!name) return '🥦';
  const n = name.toLowerCase();
  for (const [key, emoji] of Object.entries(veggieEmojis)) {
    if (n.includes(key)) return emoji;
  }
  return '🥦';
}

// Build product card HTML
function buildProductCard(product, inCart = false) {
  const emoji = getVeggieEmoji(product.name);
  const discount = product.discount_percent > 0 ? `<span class="product-discount">${Math.round(product.discount_percent)}% off</span>` : '';
  const organicBadge = product.is_organic ? `<span class="product-badge badge-organic">🌱 Organic</span>` : '';
  const discountBadge = product.discount_percent > 10 ? `<span class="product-badge badge-discount" style="top:${product.is_organic ? '36px' : '10px'}">${Math.round(product.discount_percent)}% OFF</span>` : '';

  return `
    <div class="product-card" onclick="viewProduct('${product.slug}')" id="pc-${product.id}">
      <div class="product-img-wrap">
        ${organicBadge}
        ${discountBadge}
        <button class="wishlist-btn" onclick="event.stopPropagation(); toggleWishlist('${product.id}', this)" title="Add to wishlist">❤️</button>
        <div class="product-emoji">${emoji}</div>
      </div>
      <div class="product-body">
        <div class="product-category">${product.category_name || ''}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-unit">Per ${product.unit}</div>
        <div class="product-rating">
          <span class="stars-display">${renderStars(product.rating)}</span>
          <span class="rating-value">${parseFloat(product.rating).toFixed(1)}</span>
          <span class="review-count">(${product.review_count})</span>
        </div>
        <div class="product-pricing">
          <span class="product-price">${formatCurrency(product.price)}</span>
          ${product.mrp > product.price ? `<span class="product-mrp">${formatCurrency(product.mrp)}</span>` : ''}
          ${discount}
        </div>
        <div class="product-freshness">🗓️ Fresh for ${product.freshness_days} days</div>
        <div class="product-actions" id="pa-${product.id}">
          <button class="add-cart-btn" onclick="event.stopPropagation(); addToCart('${product.id}')">
            🛒 Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

// Navigate to product
function viewProduct(slug) {
  window.location.href = `product.html?slug=${slug}`;
}

// Apply offer (copy coupon)
function applyOffer(code) {
  navigator.clipboard.writeText(code).then(() => showToast(`Coupon ${code} copied! Apply at checkout.`, 'success'));
}

// Subscribe newsletter
function subscribeNewsletter() {
  const email = document.getElementById('newsletterEmail')?.value;
  if (!email || !email.includes('@')) return showToast('Please enter a valid email address', 'error');
  showToast('🎉 Subscribed! Check your email for exclusive offers.', 'success');
  if (document.getElementById('newsletterEmail')) document.getElementById('newsletterEmail').value = '';
}

// Search with debounce
let searchTimeout;
function initGlobalSearch() {
  const input = document.getElementById('globalSearch');
  const dropdown = document.getElementById('searchDropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.classList.remove('active'); return; }
    searchTimeout = setTimeout(() => performSearch(q), 300);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.location.href = `products.html?search=${encodeURIComponent(input.value)}`;
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

async function performSearch(query) {
  const dropdown = document.getElementById('searchDropdown');
  const { ok, data } = await api.get(`/products?search=${encodeURIComponent(query)}&limit=6`);
  if (!ok || !data.products?.length) {
    dropdown.innerHTML = `<div style="padding:16px;text-align:center;color:#6b7280">No results for "${query}"</div>`;
    dropdown.classList.add('active');
    return;
  }
  dropdown.innerHTML = data.products.map(p => `
    <div class="search-result-item" onclick="viewProduct('${p.slug}')">
      <span class="search-result-emoji">${getVeggieEmoji(p.name)}</span>
      <div class="search-result-info">
        <strong>${p.name}</strong>
        <span>${formatCurrency(p.price)} per ${p.unit} • ${p.category_name}</span>
      </div>
    </div>
  `).join('') + `<div style="padding:10px 16px;text-align:center;border-top:1px solid #f3f4f6">
    <a href="products.html?search=${encodeURIComponent(query)}" style="color:var(--primary);font-size:13px;font-weight:600">See all results →</a>
  </div>`;
  dropdown.classList.add('active');
}
