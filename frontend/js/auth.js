/* ============================================================
   Auth Management
   ============================================================ */
let currentUser = null;

function getToken() { return localStorage.getItem('fv_token'); }
function setToken(token) { localStorage.setItem('fv_token', token); }
function removeToken() { localStorage.removeItem('fv_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('fv_user')); } catch { return null; }
}
function setUser(user) { localStorage.setItem('fv_user', JSON.stringify(user)); }
function removeUser() { localStorage.removeItem('fv_user'); }

function isLoggedIn() { return !!getToken() && !!getUser(); }

function updateNavUI() {
  const loginBtn = document.getElementById('loginBtn');
  const userDropdown = document.getElementById('userDropdown');
  const userInitial = document.getElementById('userInitial');
  const dropdownName = document.getElementById('dropdownName');
  const dropdownEmail = document.getElementById('dropdownEmail');
  const adminLink = document.getElementById('adminLink');

  const user = getUser();
  if (user && isLoggedIn()) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userDropdown) userDropdown.style.display = 'block';
    if (userInitial) userInitial.textContent = user.name?.charAt(0).toUpperCase() || 'U';
    if (dropdownName) dropdownName.textContent = user.name || 'User';
    if (dropdownEmail) dropdownEmail.textContent = user.email || '';
    if (adminLink && user.role === 'admin') adminLink.style.display = 'flex';
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (userDropdown) userDropdown.style.display = 'none';
  }
}

function logout() {
  removeToken();
  removeUser();
  localStorage.removeItem('fv_cart_count');
  showToast('Logged out successfully', 'info');
  updateNavUI();
  updateCartBadge(0);
  setTimeout(() => window.location.href = 'index.html', 500);
}

function initAuthNav() {
  updateNavUI();

  // Toggle dropdown
  const avatarBtn = document.getElementById('userAvatarBtn');
  const menu = document.getElementById('dropdownMenu');
  if (avatarBtn && menu) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const showing = menu.style.display !== 'none' && menu.style.display !== '';
      menu.style.display = showing ? 'none' : 'block';
    });
    document.addEventListener('click', () => { if (menu) menu.style.display = 'none'; });
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

function requireAuth() {
  if (!isLoggedIn()) {
    showToast('Please login to continue', 'warning');
    setTimeout(() => window.location.href = 'auth.html?redirect=' + encodeURIComponent(window.location.href), 800);
    return false;
  }
  return true;
}

// Toggle wishlist
async function toggleWishlist(productId, btn) {
  if (!requireAuth()) return;
  const { ok, data } = await api.post('/cart/wishlist/toggle', { product_id: productId });
  if (ok && data.success) {
    if (data.wishlisted) { btn.classList.add('active'); btn.style.color = '#ef4444'; }
    else { btn.classList.remove('active'); btn.style.color = ''; }
    showToast(data.message, 'success');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initAuthNav();
  initGlobalSearch();
});
