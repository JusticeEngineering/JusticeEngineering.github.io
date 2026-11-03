import type Stripe from 'stripe';
import { label } from './catalog.js';
import { SITE } from './config.js';
import type { Line } from './order.js';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/** A page in the site's style, using its stylesheet. */
export function page(title: string, body: string, status = 200) {
  const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<title>${esc(title)} | Justice Engineering</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,300..700&family=Geist+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="${SITE}/assets/site.css">
<link rel="stylesheet" href="${SITE}/assets/shop.css">
</head>
<body>
<header class="top"><div class="wrap grid"><a class="mark" href="${SITE}/">Justice Engineering</a></div></header>
<main class="wrap">
<div class="page-head grid"><div class="eyebrow mono"><a href="${SITE}/shop/">Shop</a></div><div><h1>${esc(title)}</h1></div></div>
<div class="cart grid"><div class="cart-body order">
${body}
</div></div>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export const message = (title: string, text: string, status: number) =>
  page(title, `<p class="cart-empty">${esc(text)}</p><p class="mono">Questions: <a href="mailto:work@justice.engineering">work@justice.engineering</a></p>`, status);

/** The order page: what was bought, download links, and where physical goods are going. */
export function orderPage(session: Stripe.Checkout.Session, lines: Line[]) {
  const id = encodeURIComponent(session.id);
  const email = session.customer_details?.email;
  const rows = lines.map(({ item, qty }) => {
    const files = item.files.map((f) =>
      `<li><a class="mono" href="/api/file?session_id=${id}&amp;file=${encodeURIComponent(f.file)}" download>${esc(f.file)}</a> <span class="mono">${mb(f.bytes)}</span>
<details><summary class="mono">SHA-256</summary><code>${f.sha256}</code></details></li>`).join('\n');
    return `<li><div><b>${esc(label(item))}</b>${item.shipped ? `<small>Qty ${qty}. Ships from New York by USPS.</small>` : ''}</div>
${files ? `<ul class="order-files">${files}</ul>` : ''}</li>`;
  }).join('\n');
  const address = session.collected_information?.shipping_details?.address;
  const shipTo = address
    ? `<p class="mono">Shipping to ${esc([address.line1, address.line2, address.city, address.state, address.postal_code].filter(Boolean).join(', '))}</p>`
    : '';
  const digital = lines.some((l) => l.item.files.length);
  return page('Thank you', `
<p class="cart-empty">Your order is confirmed.${email ? ` A receipt is on its way to ${esc(email)}.` : ''}</p>
${digital ? `<p>Download your files below. This page is your download link: bookmark it${email ? ', or use the link in your email' : ''}, to download again later. Please don't share it.</p>` : ''}
<ul class="cart-lines order-lines">${rows}</ul>
${shipTo}
<p class="mono">Questions or a problem with a file: <a href="mailto:work@justice.engineering">work@justice.engineering</a></p>
<style>
.order-lines > li{grid-template-columns:minmax(0,1fr);gap:10px}
.order-files{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.order-files li{border:0;padding:0;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
.order-files details{flex-basis:100%}
.order-files code{font-family:var(--f-mono);font-size:11px;overflow-wrap:anywhere;color:var(--ink-2)}
</style>`);
}
