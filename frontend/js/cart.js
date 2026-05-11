/* ============================================================
   Cart Management
   ============================================================ */

function updateCartBadge(count) {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

async function loadCartCount() {
  if (!isLoggedIn()) { updateCartBadge(0); return; }
  const { ok, data } = await api.get('/cart');
  if (ok && data.summary) updateCartBadge(data.summary.item_count);
}

async function addToCart(productId, quantity = 1) {
  if (!requireAuth()) return;

  const { ok, data } = await api.post('/cart/add', { product_id: productId, quantity });
  if (ok && data.success) {
    showToast('🛒 Added to cart!', 'success');
    updateCartBadge(data.cart_count);
    // Visual feedback on button
    const btn = document.querySelector(`#pa-${productId} .add-cart-btn`);
    if (btn) {
      btn.textContent = '✅ Added!';
      btn.style.background = 'var(--success)';
      setTimeout(() => {
        btn.innerHTML = '🛒 Add to Cart';
        btn.style.background = '';
      }, 1500);
    }
  } else {
    showToast(data.message || 'Failed to add to cart', 'error');
  }
}

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', loadCartCount);
