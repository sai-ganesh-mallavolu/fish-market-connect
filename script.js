/* ===== KEYS ===== */
const PRODUCTS_KEY = 'products';
const ORDERS_KEY = 'orders';

/* ===== INLINE PLACEHOLDER (offline-safe) ===== */
const PLACEHOLDER_IMG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eaf2f4"/><stop offset="100%" stop-color="#dbe7ea"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g fill="#5b6b73" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">
      <text x="50%" y="48%" font-size="28">Aqua Product</text>
      <text x="50%" y="58%" font-size="16" opacity="0.7">image unavailable</text>
    </g>
  </svg>`);

/* ===== THEME TOGGLE ===== */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}
function initTheme() {
    const stored = localStorage.getItem('theme') || 'light';
    setTheme(stored);
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        setTheme(current === 'light' ? 'dark' : 'light');
    });
}

/* ===== NAV HAMBURGER ===== */
function initNav() {
    const hb = document.getElementById('hamburger');
    const nav = document.getElementById('main-nav');
    if (!hb || !nav) return;
    hb.addEventListener('click', () => {
        const isOpen = nav.style.display === 'block';
        nav.style.display = isOpen ? 'none' : 'block';
    });
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target) && !hb.contains(e.target) && window.innerWidth < 980) {
            nav.style.display = 'none';
        }
    });
}

/* ===== BUILD products[] FROM STATIC CARDS (for farmers.html & stock sync) ===== */
function readCardsToProducts() {
    const cards = [...document.querySelectorAll('.product-card')];
    return cards.map(c => ({
        id: c.dataset.id,
        name: c.dataset.name,
        pricePerKg: Number(c.dataset.price || 0),
        availableKg: Number(c.dataset.available || 0),
        farmerName: c.dataset.farmer || '',
        farmerLocation: c.dataset.location || '',
        imageUrl: c.dataset.image || '',
        desc: c.dataset.desc || 'Fresh stock from verified farmer.'
    }));
}
function seedProductsFromDOMIfMissing() {
    if (!localStorage.getItem(PRODUCTS_KEY)) {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(readCardsToProducts()));
    }
}
/* Keep products store in sync with any manual changes in HTML on first load */
function refreshProductsFromDOM() {
    const domProducts = readCardsToProducts();
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(domProducts));
}

/* ===== FILTERS over STATIC CARDS ===== */
const state = { search: '', minPrice: '', maxPrice: '', location: '', inStockOnly: false };

function collectLocationsFromCards() {
    const cards = [...document.querySelectorAll('.product-card')];
    const select = document.getElementById('locationFilter');
    if (!select) return;
    const unique = [...new Set(cards.map(c => c.dataset.location))].sort();
    if (select.options.length <= 1) {
        unique.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc; opt.textContent = loc;
            select.appendChild(opt);
        });
    }
}

function cardMatchesFilters(card) {
    const name = (card.dataset.name || '').toLowerCase();
    const farmer = (card.dataset.farmer || '').toLowerCase();
    const loc = card.dataset.location || '';
    const price = Number(card.dataset.price || 0);
    const avail = Number(card.dataset.available || 0);

    if (state.search) {
        const s = state.search.toLowerCase();
        if (!(name.includes(s) || farmer.includes(s) || loc.toLowerCase().includes(s))) return false;
    }
    if (state.minPrice !== '' && price < Number(state.minPrice)) return false;
    if (state.maxPrice !== '' && price > Number(state.maxPrice)) return false;
    if (state.location && loc !== state.location) return false;
    if (state.inStockOnly && avail <= 0) return false;
    return true;
}

function renderFiltersOnCards() {
    const cards = [...document.querySelectorAll('.product-card')];
    cards.forEach(card => {
        card.style.display = cardMatchesFilters(card) ? '' : 'none';
    });
}

function initFilters() {
    collectLocationsFromCards();

    const search = document.getElementById('search');
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');
    const location = document.getElementById('locationFilter');
    const inStockOnly = document.getElementById('inStockOnly');
    const clear = document.getElementById('clearFilters');

    if (search) search.addEventListener('input', (e) => { state.search = e.target.value.trim(); renderFiltersOnCards(); });
    if (minPrice) minPrice.addEventListener('input', (e) => { state.minPrice = e.target.value; renderFiltersOnCards(); });
    if (maxPrice) maxPrice.addEventListener('input', (e) => { state.maxPrice = e.target.value; renderFiltersOnCards(); });
    if (location) location.addEventListener('change', (e) => { state.location = e.target.value; renderFiltersOnCards(); });
    if (inStockOnly) inStockOnly.addEventListener('change', (e) => { state.inStockOnly = e.target.checked; renderFiltersOnCards(); });
    if (clear) clear.addEventListener('click', () => {
        state.search = ''; state.minPrice = ''; state.maxPrice = ''; state.location = ''; state.inStockOnly = false;
        if (search) search.value = '';
        if (minPrice) minPrice.value = '';
        if (maxPrice) maxPrice.value = '';
        if (location) location.value = '';
        if (inStockOnly) inStockOnly.checked = false;
        renderFiltersOnCards();
    });
}

/* ===== OPEN DETAILS / ORDER using productId from localStorage store ===== */
function getProducts() {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
}
function saveProducts(list) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
}

/* Details */
function openProductDetailsById(productId) {
    const p = getProducts().find(x => x.id === productId);
    if (!p) return;
    const img = document.getElementById('details-image');
    img.referrerPolicy = 'no-referrer';
    img.src = p.imageUrl || PLACEHOLDER_IMG;
    img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER_IMG; };

    document.getElementById('details-name').textContent = p.name;
    document.getElementById('details-farmer').textContent = `${p.farmerName} • ${p.farmerLocation}`;
    document.getElementById('details-price').textContent = `₹${p.pricePerKg}/kg`;
    document.getElementById('details-available').textContent = p.availableKg;
    document.getElementById('details-desc').textContent = p.desc || 'Fresh stock from verified farmer.';

    const orderBtn = document.getElementById('details-order-btn');
    orderBtn.onclick = () => { closeProductDetails(); openOrderFormById(p.id); };

    document.getElementById('details-modal').style.display = 'block';
}
function closeProductDetails() {
    document.getElementById('details-modal').style.display = 'none';
}

/* Order modal */
function setPickupMinDate() {
    const input = document.getElementById('pickup-date');
    if (!input) return;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    input.min = `${y}-${m}-${d}`;
}

function openOrderFormById(productId) {
    const p = getProducts().find(x => x.id === productId);
    if (!p) return;

    document.getElementById("order-modal").style.display = "block";
    document.getElementById("product-id").value = p.id;
    document.getElementById("fish-name").value = p.name;
    document.getElementById("price-per-kg").value = String(p.pricePerKg);
    document.getElementById("fish-display").textContent = `${p.name} @ ₹${p.pricePerKg}/kg`;

    document.getElementById("farmer-name").value = p.farmerName;
    document.getElementById("farmer-location").value = p.farmerLocation;
    document.getElementById("available-quantity").value = p.availableKg;

    ["error-message", "phone-error-message", "date-error-message"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    document.getElementById("quantity").value = "";
    document.getElementById("buyer-name").value = "";
    document.getElementById("buyer-phone").value = "";
    document.getElementById("buyer-location").value = "";
    const pd = document.getElementById("pickup-date"); if (pd) pd.value = "";

    setPickupMinDate();
}

function closeOrderForm() {
    document.getElementById("order-modal").style.display = "none";
}

/* Submit order (orders saved; stock reduces only after farmer confirms in farmers.html) */
function submitOrder(e) {
    e.preventDefault();

    const productId = document.getElementById("product-id").value;
    const fish = document.getElementById("fish-name").value;
    const pricePerKg = parseInt(document.getElementById("price-per-kg").value, 10) || 0;
    const quantity = parseInt(document.getElementById("quantity").value, 10);
    const pickupDate = document.getElementById("pickup-date").value;
    const name = document.getElementById("buyer-name").value.trim();
    const phone = document.getElementById("buyer-phone").value.replace(/\D/g, "");
    const location = document.getElementById("buyer-location").value.trim();
    const farmerName = document.getElementById("farmer-name").value;
    const farmerLocation = document.getElementById("farmer-location").value;

    ["error-message", "phone-error-message", "date-error-message"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    const products = getProducts();
    const p = products.find(x => x.id === productId);
    const available = p ? p.availableKg : 0;

    if (quantity > available) {
        document.getElementById("error-message").style.display = "block";
        return;
    }
    if (!/^\d{10}$/.test(phone)) {
        document.getElementById("phone-error-message").style.display = "block";
        return;
    }
    if (!pickupDate) {
        document.getElementById("date-error-message").style.display = "block";
        return;
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const chosen = new Date(pickupDate + 'T00:00:00');
    if (chosen < today) {
        document.getElementById("date-error-message").style.display = "block";
        return;
    }

    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    orders.push({
        productId, fish, pricePerKg, quantity, pickupDate,
        name, phone, location, farmerName, farmerLocation,
        status: 'Pending',
        orderDate: new Date().toISOString()
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

    // Confirmation modal
    document.getElementById("confirmation-fish").textContent = fish;
    document.getElementById("confirmation-quantity").textContent = quantity;
    document.getElementById("confirmation-pickup-date").textContent = pickupDate;
    document.getElementById("confirmation-name").textContent = name;
    document.getElementById("confirmation-phone").textContent = phone;
    document.getElementById("confirmation-location").textContent = location;
    document.getElementById("confirmation-farmer").textContent = farmerName;
    document.getElementById("confirmation-farmer-location").textContent = farmerLocation;

    document.getElementById("confirmation-modal").style.display = "flex";
    closeOrderForm();
}

function closeConfirmation() {
    document.getElementById("confirmation-modal").style.display = "none";
}

/* Sync: if stock updated in farmers.html (localStorage), update numbers on cards */
function syncAvailableFromStoreToCards() {
    const products = getProducts();
    products.forEach(p => {
        const span = document.getElementById(`available-${p.id}`);
        const card = document.querySelector(`.product-card[data-id="${p.id}"]`);
        if (span) span.textContent = p.availableKg;
        if (card) card.dataset.available = p.availableKg;
    });
}
window.addEventListener('storage', (e) => {
    if (e.key === PRODUCTS_KEY) syncAvailableFromStoreToCards();
});
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncAvailableFromStoreToCards();
});

/* Footer year */
(function () {
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
})();

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
    seedProductsFromDOMIfMissing();   // create products store if missing
    refreshProductsFromDOM();         // keep store aligned to current HTML
    initFilters();
    renderFiltersOnCards();
    syncAvailableFromStoreToCards();
});
