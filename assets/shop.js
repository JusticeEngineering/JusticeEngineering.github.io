// @ts-check
// Shop: product copy, images and prices live in _products/ and reach this script through the
// #shop-config JSON that _includes/shop-script.html writes. The cart is kept in localStorage
// (no cookies on this site). Checkout posts the cart to the shop service in shop-api/, which
// prices it again from the same product files and hands the buyer to Stripe Checkout.

/** @typedef {{ key: string, handle: string, product: string, name: string, price: number | null, shipped: boolean, url: string }} Item */
/** @typedef {{ key: string, qty: number }} Line */

const cfgEl = document.getElementById('shop-config');
/** @type {{ api: string, items: Item[] }} */
const cfg = cfgEl ? JSON.parse(cfgEl.textContent || '{}') : { api: '', items: [] };
/** Items that can be bought now. */
const items = new Map(cfg.items.filter((i) => cfg.api && i.price !== null).map((i) => [i.key, i]));
const STORE_KEY = 'je-cart';
const MAX_QTY = 99;

/** @param {number} dollars */
const money = (dollars) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2 }).format(dollars);

/** @param {Item} i */
const label = (i) => (i.name ? `${i.product}, ${i.name}` : i.product);

// ---- Cart storage and header count ----

/** @returns {Line[]} the stored cart, without items no longer for sale */
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    return Array.isArray(raw?.lines) ? raw.lines.filter((/** @type {Line} */ l) => items.has(l.key) && l.qty > 0) : [];
  } catch { return []; }
}

/** @param {Line[]} lines */
function save(lines) {
  try {
    if (lines.length) localStorage.setItem(STORE_KEY, JSON.stringify({ lines }));
    else localStorage.removeItem(STORE_KEY);
  } catch { /* storage blocked: the cart still works for this page view */ }
  showCount(lines);
}

/** @param {Line[]} lines */
function showCount(lines) {
  const link = document.getElementById('cart-link');
  if (!link) return;
  const qty = lines.reduce((n, l) => n + l.qty, 0);
  link.hidden = qty === 0;
  const n = link.querySelector('span');
  if (n) n.textContent = String(qty);
}

/**
 * Adds an item; a download can only be in the cart once.
 * @param {string} key @param {number} qty @returns {boolean} false when it was already there
 */
function add(key, qty) {
  const item = /** @type {Item} */ (items.get(key));
  const lines = load();
  const line = lines.find((l) => l.key === key);
  if (line && !item.shipped) return false;
  if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
  else lines.push({ key, qty: item.shipped ? qty : 1 });
  save(lines);
  return true;
}

// ---- Catalog ----

function initCatalog() {
  for (const card of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('[data-price-handle]'))) {
    const prices = [...items.values()].filter((i) => i.handle === card.dataset.priceHandle).map((i) => /** @type {number} */ (i.price));
    const out = card.querySelector('[data-price]');
    if (!out || !prices.length) continue;
    const min = Math.min(...prices);
    out.textContent = (prices.some((p) => p !== min) ? 'From ' : '') + money(min);
  }
}

// ---- Product page ----

function initProduct() {
  const root = /** @type {HTMLElement | null} */ (document.querySelector('[data-product]'));
  if (!root) return;
  const options = [...items.values()].filter((i) => i.handle === root.dataset.product);
  if (!options.length) return; // stays "Available soon"
  const form = /** @type {HTMLFormElement} */ (root.querySelector('[data-buy]'));
  const button = /** @type {HTMLButtonElement} */ (form.querySelector('button'));
  const msg = /** @type {HTMLElement} */ (form.querySelector('.buy-msg'));
  const priceEl = /** @type {HTMLElement} */ (root.querySelector('[data-price]'));
  const select = /** @type {HTMLSelectElement} */ (form.querySelector('select'));
  const qtyInput = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name=qty]'));

  if (options.length > 1) {
    for (const o of options) select.add(new Option(`${o.name} (${money(/** @type {number} */ (o.price))})`, o.key));
    /** @type {HTMLElement} */ (select.parentElement).hidden = false;
  }
  const current = () => options.find((o) => o.key === select.value) ?? options[0];
  const render = () => {
    priceEl.textContent = money(/** @type {number} */ (current().price));
    button.disabled = false;
    button.textContent = 'Add to cart';
  };
  select.addEventListener('change', () => { msg.textContent = ''; render(); });
  render();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const qty = Math.max(1, Math.min(MAX_QTY, Number(qtyInput?.value) || 1));
    msg.textContent = add(current().key, qty) ? 'Added. ' : 'Already in your cart. ';
    const a = document.createElement('a');
    a.href = '/shop/cart/';
    a.textContent = 'View cart';
    msg.append(a);
  });
}

// ---- Cart page ----

function initCart() {
  const root = document.querySelector('[data-cart]');
  if (!root) return;
  const list = /** @type {HTMLElement} */ (root.querySelector('[data-cart-lines]'));
  const empty = /** @type {HTMLElement} */ (root.querySelector('[data-cart-empty]'));
  const foot = /** @type {HTMLElement} */ (root.querySelector('[data-cart-foot]'));
  const subtotal = /** @type {HTMLElement} */ (root.querySelector('[data-cart-subtotal]'));
  const checkout = /** @type {HTMLFormElement} */ (root.querySelector('[data-checkout]'));
  const msg = /** @type {HTMLElement} */ (root.querySelector('[data-cart-msg]'));
  const shipNote = /** @type {HTMLElement} */ (root.querySelector('[data-ship-note]'));

  const error = new URLSearchParams(location.search).get('error');
  if (error) msg.textContent = error;
  checkout.action = `${cfg.api}/api/checkout`;

  const render = () => {
    const lines = load();
    list.replaceChildren(...lines.map(lineRow));
    totals(lines);
  };

  /** Everything below the lines; rows update their own price, so an edited field keeps focus. */
  const totals = (lines = load()) => {
    empty.hidden = lines.length > 0;
    foot.hidden = lines.length === 0;
    const total = lines.reduce((sum, l) => sum + /** @type {number} */ (items.get(l.key)?.price) * l.qty, 0);
    subtotal.textContent = money(Math.round(total * 100) / 100);
    shipNote.hidden = !lines.some((l) => items.get(l.key)?.shipped);
    /** @type {HTMLInputElement} */ (checkout.elements.namedItem('items')).value = JSON.stringify(lines);
  };

  /** @param {string} key */
  const removeLine = (key) => {
    save(load().filter((l) => l.key !== key));
    render();
  };

  /** @param {Line} line */
  const lineRow = (line) => {
    const item = /** @type {Item} */ (items.get(line.key));
    const li = document.createElement('li');
    const name = document.createElement('div');
    const title = document.createElement('a');
    title.href = item.url;
    const b = document.createElement('b');
    b.textContent = item.product;
    title.append(b);
    const sub = document.createElement('small');
    sub.textContent = [item.name, item.shipped ? 'Shipped' : 'Download'].filter(Boolean).join(' · ');
    name.append(title, sub);
    const price = document.createElement('span');
    price.className = 'mono';
    price.textContent = money(/** @type {number} */ (item.price) * line.qty);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${label(item)}`);
    remove.addEventListener('click', () => removeLine(line.key));
    if (item.shipped) {
      const qty = document.createElement('input');
      Object.assign(qty, { type: 'number', min: '0', max: String(MAX_QTY), value: String(line.qty), inputMode: 'numeric' });
      qty.setAttribute('aria-label', `Quantity of ${label(item)}`);
      qty.addEventListener('change', () => {
        const n = Math.max(0, Math.min(MAX_QTY, Math.floor(Number(qty.value)) || 0));
        if (n === 0) return removeLine(line.key);
        qty.value = String(n);
        const lines = load().map((l) => (l.key === line.key ? { key: l.key, qty: n } : l));
        save(lines);
        price.textContent = money(/** @type {number} */ (item.price) * n);
        totals(lines);
      });
      li.append(name, qty, price, remove);
    } else {
      li.append(name, document.createElement('span'), price, remove);
    }
    return li;
  };

  checkout.addEventListener('submit', () => {
    /** @type {HTMLButtonElement} */ (checkout.querySelector('button')).disabled = true;
    msg.textContent = 'Opening secure checkout…';
  });
  // Coming back from Stripe with the browser's back button restores this page from cache.
  addEventListener('pageshow', () => {
    /** @type {HTMLButtonElement} */ (checkout.querySelector('button')).disabled = false;
    if (msg.textContent === 'Opening secure checkout…') msg.textContent = '';
    render();
  });
  render();
}

// ---- Thank-you page: Stripe returns here; empty the cart and go to the order page ----

function initThanks() {
  const root = /** @type {HTMLElement | null} */ (document.querySelector('[data-thanks]'));
  if (!root) return;
  save([]);
  const id = new URLSearchParams(location.search).get('session_id');
  if (!id || !cfg.api) return;
  const url = `${cfg.api}/order?session_id=${encodeURIComponent(id)}`;
  const link = /** @type {HTMLAnchorElement} */ (root.querySelector('a[data-order]'));
  link.href = url;
  link.hidden = false;
  location.replace(url);
}

showCount(load());
for (const init of [initCatalog, initProduct, initCart, initThanks]) {
  try { init(); } catch (err) { console.error('shop:', err); }
}
