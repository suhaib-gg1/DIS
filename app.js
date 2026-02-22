/**
 * Elite Sport - واجهة عرض فقط (فرونت اند، صفحة واحدة)
 */

(function () {
  'use strict';

  const STORAGE_CART = 'elite_sport_cart';
  const CATEGORY_LABELS = {
    all: 'الكل',
    men: 'رجالي',
    shoes: 'أحذية',
    sets: 'أطقم تدريب',
    accessories: 'إكسسوارات',
  };

  function getProducts() {
    return window.ELITE_SPORT_PRODUCTS || [];
  }

  function getCart() {
    try {
      var stored = localStorage.getItem(STORAGE_CART);
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [];
  }

  function saveCart(items) {
    localStorage.setItem(STORAGE_CART, JSON.stringify(items));
    updateCartUI();
  }

  function addToCart(productId, size, qty) {
    qty = qty || 1;
    var products = getProducts();
    var product = products.find(function (p) { return p.id === productId; });
    if (!product) return;
    var cart = getCart();
    var key = productId + '|' + size;
    var existing = cart.find(function (i) { return i.key === key; });
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        key: key,
        id: productId,
        name: product.name,
        size: size,
        price: product.price,
        image: product.image,
        qty: qty,
      });
    }
    saveCart(cart);
  }

  function removeFromCart(key) {
    saveCart(getCart().filter(function (i) { return i.key !== key; }));
  }

  function setCartQty(key, qty) {
    if (qty < 1) { removeFromCart(key); return; }
    var cart = getCart();
    var item = cart.find(function (i) { return i.key === key; });
    if (item) { item.qty = qty; saveCart(cart); }
  }

  function getCartCount() {
    return getCart().reduce(function (sum, i) { return sum + i.qty; }, 0);
  }

  function getCartTotal() {
    return getCart().reduce(function (sum, i) { return sum + i.price * i.qty; }, 0);
  }

  function updateCartUI() {
    var badge = document.getElementById('cartCount');
    if (badge) badge.textContent = getCartCount();
    renderCartItems();
  }

  function renderProducts(list) {
    var container = document.getElementById('productGrid');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<p class="es-empty-state">لا توجد منتجات تطابق البحث.</p>';
      return;
    }
    container.innerHTML = list.map(function (p) {
      var cat = CATEGORY_LABELS[p.category] || p.category;
      return (
        '<article class="es-card" data-product-id="' + p.id + '">' +
        '<div class="es-card-image-wrap"><img class="es-card-image" src="' + (p.image || '') + '" alt="' + (p.name || '') + '" loading="lazy" /></div>' +
        '<div class="es-card-body">' +
        '<span class="es-card-category">' + cat + '</span>' +
        '<h3 class="es-card-title">' + (p.name || '') + '</h3>' +
        '<p class="es-card-price">' + (p.price || 0) + ' ر.س</p>' +
        '<button type="button" class="es-button es-button--primary" data-product-id="' + p.id + '">عرض</button>' +
        '</div></article>'
      );
    }).join('');

    container.querySelectorAll('[data-product-id]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openProductModal(btn.getAttribute('data-product-id'));
      });
    });
    container.querySelectorAll('.es-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        openProductModal(card.getAttribute('data-product-id'));
      });
    });
  }

  function openProductModal(productId) {
    var products = getProducts();
    var product = products.find(function (p) { return p.id === productId; });
    if (!product) return;
    var modal = document.getElementById('productModal');
    if (!modal) return;

    document.getElementById('modalProductImage').src = product.image || '';
    document.getElementById('modalProductImage').alt = product.name || '';
    document.getElementById('modalProductName').textContent = product.name || '';
    document.getElementById('modalProductDescription').textContent = product.description || '';
    document.getElementById('modalProductCategory').textContent = CATEGORY_LABELS[product.category] || product.category;
    document.getElementById('modalProductPrice').textContent = (product.price || 0) + ' ر.س';

    var sizesEl = document.getElementById('modalSizeOptions');
    sizesEl.innerHTML = '';
    var sizes = (product.sizes && product.sizes.length) ? product.sizes : ['S', 'M', 'L'];
    var selectedSize = sizes[0];
    sizes.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'es-size-option';
      btn.textContent = s;
      btn.addEventListener('click', function () {
        sizesEl.querySelectorAll('.es-size-option').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        selectedSize = s;
      });
      sizesEl.appendChild(btn);
    });
    if (sizesEl.firstChild) sizesEl.firstChild.classList.add('is-selected');

    var addBtn = document.getElementById('modalAddToCartBtn');
    addBtn.onclick = function () {
      addToCart(product.id, selectedSize, 1);
      addBtn.classList.add('es-add-to-cart-ani');
      setTimeout(function () { addBtn.classList.remove('es-add-to-cart-ani'); }, 400);
    };

    modal.classList.add('is-open');
  }

  function closeProductModal() {
    var modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('is-open');
  }

  function renderCartItems() {
    var container = document.getElementById('cartItems');
    if (!container) return;
    var cart = getCart();
    if (!cart.length) {
      container.innerHTML = '<p class="es-cart-empty">السلة فارغة.</p>';
      if (document.getElementById('cartTotal')) document.getElementById('cartTotal').textContent = '0 ر.س';
      return;
    }
    container.innerHTML = cart.map(function (item) {
      return (
        '<div class="es-cart-item" data-key="' + item.key + '">' +
        '<img class="es-cart-item-image" src="' + (item.image || '') + '" alt="" />' +
        '<div class="es-cart-item-details">' +
        '<div class="es-cart-item-name">' + item.name + '</div>' +
        '<div class="es-cart-item-meta">مقاس ' + item.size + '</div>' +
        '<div class="es-cart-item-row">' +
        '<div class="es-cart-qty">' +
        '<button type="button" class="es-cart-qty-minus" data-key="' + item.key + '">−</button>' +
        '<span>' + item.qty + '</span>' +
        '<button type="button" class="es-cart-qty-plus" data-key="' + item.key + '">+</button>' +
        '</div>' +
        '<span class="es-cart-item-price">' + (item.price * item.qty) + ' ر.س</span>' +
        '<button type="button" class="es-cart-item-remove" data-key="' + item.key + '">×</button>' +
        '</div></div></div>'
      );
    }).join('');

    if (document.getElementById('cartTotal')) document.getElementById('cartTotal').textContent = getCartTotal() + ' ر.س';

    container.querySelectorAll('.es-cart-qty-minus').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = getCart().find(function (i) { return i.key === btn.getAttribute('data-key'); });
        if (item) setCartQty(item.key, item.qty - 1);
      });
    });
    container.querySelectorAll('.es-cart-qty-plus').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = getCart().find(function (i) { return i.key === btn.getAttribute('data-key'); });
        if (item) setCartQty(item.key, item.qty + 1);
      });
    });
    container.querySelectorAll('.es-cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () { removeFromCart(btn.getAttribute('data-key')); });
    });
  }

  function filterProducts() {
    var products = getProducts();
    var active = document.querySelector('.es-nav-link--active');
    var cat = active ? active.getAttribute('data-category') : 'all';
    var search = (document.getElementById('searchInput') && document.getElementById('searchInput').value || '').trim().toLowerCase();

    var list = products.filter(function (p) {
      if (cat !== 'all' && p.category !== cat) return false;
      if (search) {
        var name = (p.name || '').toLowerCase();
        var desc = (p.description || '').toLowerCase();
        if (!name.includes(search) && !desc.includes(search)) return false;
      }
      return true;
    });
    renderProducts(list);
  }

  function init() {
    document.querySelectorAll('.es-nav-link').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.es-nav-link').forEach(function (b) { b.classList.remove('es-nav-link--active'); });
        btn.classList.add('es-nav-link--active');
        filterProducts();
      });
    });

    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', filterProducts);
    }

    document.querySelectorAll('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', function () { closeProductModal(); });
    });

    var cartToggle = document.getElementById('cartToggleBtn');
    if (cartToggle) cartToggle.addEventListener('click', function () {
      document.getElementById('cartDrawer').classList.add('is-open');
    });
    var cartClose = document.getElementById('cartCloseBtn');
    if (cartClose) cartClose.addEventListener('click', function () {
      document.getElementById('cartDrawer').classList.remove('is-open');
    });

    var cartPayBtn = document.getElementById('cartPayBtn');
    if (cartPayBtn) cartPayBtn.addEventListener('click', function () {
      var cart = getCart();
      var msgEl = document.getElementById('paymentModalMessage');
      var modal = document.getElementById('paymentModal');
      if (!cart.length) {
        if (msgEl) msgEl.textContent = 'السلة فارغة.';
        if (modal) modal.classList.add('is-open');
        return;
      }
      if (msgEl) msgEl.textContent = 'تم الدفع';
      if (modal) modal.classList.add('is-open');
      saveCart([]);
    });

    function closePaymentModal() {
      var modal = document.getElementById('paymentModal');
      if (modal) modal.classList.remove('is-open');
    }
    document.querySelectorAll('[data-close-payment-modal]').forEach(function (el) {
      el.addEventListener('click', closePaymentModal);
    });
    var paymentModalOk = document.getElementById('paymentModalOk');
    if (paymentModalOk) paymentModalOk.addEventListener('click', closePaymentModal);

    updateCartUI();
    filterProducts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
