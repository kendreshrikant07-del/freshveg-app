/* ============================================================
   Home Page Logic
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  createParticles();
  await Promise.all([loadCategories(), loadFeaturedProducts()]);
});

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const emojis = ['🥦', '🍅', '🥕', '🧅', '🥬', '🌶️', '🫑', '🥒', '🌿', '🍄'];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --dur: ${4 + Math.random() * 4}s;
      --delay: ${Math.random() * 4}s;
      font-size: ${12 + Math.random() * 14}px;
      opacity: ${0.1 + Math.random() * 0.2};
    `;
    container.appendChild(p);
  }
}

async function loadCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  const { ok, data } = await api.get('/products/categories');
  if (!ok || !data.categories?.length) {
    grid.innerHTML = '<p style="color:#6b7280">Failed to load categories</p>';
    return;
  }

  grid.innerHTML = data.categories.map(cat => `
    <a href="products.html?category=${cat.slug}" class="category-card">
      <span class="cat-icon">${cat.icon || '🥦'}</span>
      <div class="cat-name">${cat.name}</div>
      <div class="cat-count">${cat.product_count} items</div>
    </a>
  `).join('');
}

async function loadFeaturedProducts() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  const { ok, data } = await api.get('/products/featured');
  if (!ok || !data.products?.length) {
    grid.innerHTML = '<p style="color:#6b7280;padding:20px">Failed to load products</p>';
    return;
  }

  grid.innerHTML = data.products.map(p => buildProductCard(p)).join('');
}
