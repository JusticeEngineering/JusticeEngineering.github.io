// @ts-check
// Shop: talks to Shopify's Storefront API (public GraphQL, CORS-enabled) straight from the browser.
// Product copy and images live in _products/; Shopify supplies price, variants, stock, the cart and checkout.
// The cart id is kept in localStorage (no cookies on this site); checkout itself happens on Shopify.

/** @typedef {{ amount: string, currencyCode: string }} Money */
/** @typedef {{ id: string, title: string, availableForSale: boolean, price: Money }} Variant */
/** @typedef {{ id: string, quantity: number, cost: { totalAmount: Money }, merchandise: { id: string, title: string, product: { title: string, handle: string } } }} CartLine */
/** @typedef {{ id: string, checkoutUrl: string, totalQuantity: number, cost: { subtotalAmount: Money }, lines: { edges: { node: CartLine }[] } }} Cart */

const cfgEl = document.getElementById('shop-config');
/** @type {{ domain: string, token: string, version: string }} */
const cfg = cfgEl ? JSON.parse(cfgEl.textContent || '{}') : { domain: '', token: '', version: '' };
const live = Boolean(cfg.domain && cfg.token);
const STORE_KEY = 'je-cart';

const CART_FIELDS = `
  id checkoutUrl totalQuantity
  cost { subtotalAmount { amount currencyCode } }
  lines(first: 100) { edges { node {
    id quantity
    cost { totalAmount { amount currencyCode } }
    merchandise { ... on ProductVariant { id title product { title handle } } }
  } } }`;

/**
 * @param {string} query
 * @param {Record<string, unknown>} [variables]
 * @returns {Promise<any>}
 */
async function gql(query, variables = {}) {
  const res = await fetch(`https://${cfg.domain}/api/${cfg.version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': cfg.token },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify returned ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

/** Throws on a mutation's userErrors and returns its cart. */
function cartFrom(/** @type {{ cart: Cart | null, userErrors: { message: string }[] }} */ payload) {
  if (payload.userErrors?.length) throw new Error(payload.userErrors[0].message);
  if (!payload.cart) throw new Error('Cart not found');
  return payload.cart;
}

/** @param {Money} m */
const money = (m) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: m.currencyCode }).format(Number(m.amount));

// ---- Cart storage and header count ----

/** @returns {{ id: string, qty: number } | null} */
function stored() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; }
}

/** @param {Cart | null} cart */
function remember(cart) {
  try {
    if (cart) localStorage.setItem(STORE_KEY, JSON.stringify({ id: cart.id, qty: cart.totalQuantity }));
    else localStorage.removeItem(STORE_KEY);
  } catch { /* storage blocked: the cart still works for this page view */ }
  showCount(cart ? cart.totalQuantity : 0);
}

/** @param {number} qty */
function showCount(qty) {
  const link = document.getElementById('cart-link');
  if (!link) return;
  link.hidden = !(qty > 0);
  const n = link.querySelector('span');
  if (n) n.textContent = String(qty);
}

/** @returns {Promise<Cart | null>} */
async function loadCart() {
  const s = stored();
  if (!s) return null;
  const data = await gql(`query($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`, { id: s.id });
  remember(data.cart); // a null cart has expired or been checked out
  return data.cart;
}

/** @param {string} variantId @param {number} quantity @returns {Promise<Cart>} */
async function addToCart(variantId, quantity) {
  const lines = [{ merchandiseId: variantId, quantity }];
  const s = stored();
  if (s) {
    try {
      const data = await gql(
        `mutation($id: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $id, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`,
        { id: s.id, lines });
      const cart = cartFrom(data.cartLinesAdd);
      remember(cart);
      return cart;
    } catch { /* expired or completed cart: start a new one below */ }
  }
  const data = await gql(
    `mutation($lines: [CartLineInput!]!) { cartCreate(input: { lines: $lines }) { cart { ${CART_FIELDS} } userErrors { message } } }`,
    { lines });
  const cart = cartFrom(data.cartCreate);
  remember(cart);
  return cart;
}

/** @param {string} cartId @param {string} lineId @param {number} quantity @returns {Promise<Cart>} */
async function setLineQty(cartId, lineId, quantity) {
  const data = quantity > 0
    ? (await gql(
        `mutation($id: ID!, $lines: [CartLineUpdateInput!]!) { r: cartLinesUpdate(cartId: $id, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`,
        { id: cartId, lines: [{ id: lineId, quantity }] }))
    : (await gql(
        `mutation($id: ID!, $ids: [ID!]!) { r: cartLinesRemove(cartId: $id, lineIds: $ids) { cart { ${CART_FIELDS} } userErrors { message } } }`,
        { id: cartId, ids: [lineId] }));
  const cart = cartFrom(data.r);
  remember(cart);
  return cart;
}

// ---- Catalog: live prices for every listed product in one request ----

async function initCatalog() {
  const cards = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('[data-price-handle]')]);
  if (!cards.length || !live) return;
  const vars = cards.map((_, i) => `$h${i}: String!`).join(', ');
  const fields = cards
    .map((_, i) => `p${i}: product(handle: $h${i}) { availableForSale priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } } }`)
    .join('\n');
  const variables = Object.fromEntries(cards.map((c, i) => [`h${i}`, c.dataset.priceHandle]));
  const data = await gql(`query(${vars}) { ${fields} }`, variables);
  cards.forEach((card, i) => {
    const p = data[`p${i}`];
    const out = card.querySelector('[data-price]');
    if (!p || !out) return;
    const { minVariantPrice: min, maxVariantPrice: max } = p.priceRange;
    out.textContent = !p.availableForSale ? 'Sold out' : (min.amount === max.amount ? '' : 'From ') + money(min);
  });
}

// ---- Product page ----

async function initProduct() {
  const root = /** @type {HTMLElement | null} */ (document.querySelector('[data-product]'));
  if (!root || !live) return;
  const form = /** @type {HTMLFormElement} */ (root.querySelector('[data-buy]'));
  const button = /** @type {HTMLButtonElement} */ (form.querySelector('button'));
  const msg = /** @type {HTMLElement} */ (form.querySelector('.buy-msg'));
  const priceEl = /** @type {HTMLElement} */ (root.querySelector('[data-price]'));
  const select = /** @type {HTMLSelectElement} */ (form.querySelector('select'));
  const qtyInput = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name=qty]'));

  const data = await gql(
    `query($h: String!) { product(handle: $h) { variants(first: 50) { nodes { id title availableForSale price { amount currencyCode } } } } }`,
    { h: root.dataset.product });
  /** @type {Variant[]} */
  const variants = data.product?.variants.nodes ?? [];
  if (!variants.length) { button.textContent = 'Not available yet'; return; }

  if (variants.length > 1) {
    for (const v of variants) select.add(new Option(v.availableForSale ? v.title : `${v.title} (sold out)`, v.id));
    /** @type {HTMLElement} */ (select.parentElement).hidden = false;
    const first = variants.find((v) => v.availableForSale);
    if (first) select.value = first.id;
  }
  const current = () => variants.find((v) => v.id === select.value) ?? variants[0];
  const render = () => {
    const v = current();
    priceEl.textContent = money(v.price);
    button.disabled = !v.availableForSale;
    button.textContent = v.availableForSale ? 'Add to cart' : 'Sold out';
  };
  select.addEventListener('change', render);
  render();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qty = Math.max(1, Math.min(99, Number(qtyInput?.value) || 1));
    button.disabled = true;
    msg.textContent = 'Adding…';
    try {
      await addToCart(current().id, qty);
      msg.textContent = 'Added. ';
      const a = document.createElement('a');
      a.href = '/shop/cart/';
      a.textContent = 'View cart';
      msg.append(a);
    } catch (err) {
      msg.textContent = `Couldn't add to cart: ${/** @type {Error} */ (err).message}`;
    } finally {
      render();
    }
  });
}

// ---- Cart page ----

async function initCart() {
  const root = document.querySelector('[data-cart]');
  if (!root) return;
  const list = /** @type {HTMLElement} */ (root.querySelector('[data-cart-lines]'));
  const empty = /** @type {HTMLElement} */ (root.querySelector('[data-cart-empty]'));
  const foot = /** @type {HTMLElement} */ (root.querySelector('[data-cart-foot]'));
  const subtotal = /** @type {HTMLElement} */ (root.querySelector('[data-cart-subtotal]'));
  const checkout = /** @type {HTMLAnchorElement} */ (root.querySelector('[data-checkout]'));
  const msg = /** @type {HTMLElement} */ (root.querySelector('[data-cart-msg]'));
  if (!live) return;

  /** @param {Cart | null} cart */
  const render = (cart) => {
    const lines = cart?.lines.edges.map((e) => e.node) ?? [];
    list.replaceChildren(...lines.map((line) => lineRow(/** @type {Cart} */ (cart), line)));
    empty.hidden = lines.length > 0;
    foot.hidden = lines.length === 0;
    if (cart && lines.length) {
      subtotal.textContent = money(cart.cost.subtotalAmount);
      checkout.href = cart.checkoutUrl;
    }
  };

  /** @param {Cart} cart @param {CartLine} line */
  const lineRow = (cart, line) => {
    const li = document.createElement('li');
    const name = document.createElement('div');
    const title = document.createElement('b');
    title.textContent = line.merchandise.product.title;
    name.append(title);
    if (line.merchandise.title !== 'Default Title') {
      const sub = document.createElement('small');
      sub.textContent = line.merchandise.title;
      name.append(sub);
    }
    const qty = document.createElement('input');
    Object.assign(qty, { type: 'number', min: '0', max: '99', value: String(line.quantity), inputMode: 'numeric' });
    qty.setAttribute('aria-label', `Quantity of ${line.merchandise.product.title}`);
    const price = document.createElement('span');
    price.className = 'mono';
    price.textContent = money(line.cost.totalAmount);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';

    /** @param {number} n */
    const change = async (n) => {
      qty.disabled = remove.disabled = true;
      try { render(await setLineQty(cart.id, line.id, n)); msg.textContent = ''; }
      catch (err) { msg.textContent = `Couldn't update the cart: ${/** @type {Error} */ (err).message}`; qty.disabled = remove.disabled = false; }
    };
    qty.addEventListener('change', () => change(Math.max(0, Math.min(99, Number(qty.value) || 0))));
    remove.addEventListener('click', () => change(0));
    li.append(name, qty, price, remove);
    return li;
  };

  try { render(await loadCart()); }
  catch (err) { msg.textContent = `Couldn't load the cart: ${/** @type {Error} */ (err).message}`; }
}

showCount(stored()?.qty ?? 0);
for (const init of [initCatalog, initProduct, initCart]) {
  init().catch((err) => console.error('shop:', err));
}
