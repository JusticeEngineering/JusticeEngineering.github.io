import type Stripe from 'stripe';
import { label } from './catalog.js';
import type { Line } from './order.js';

/**
 * Emails the buyer their order link through Resend, when RESEND_API_KEY is set.
 * Without it the buyer still gets Stripe's receipt and the order page they land on.
 */
export async function sendOrderEmail(session: Stripe.Checkout.Session, lines: Line[], orderUrl: string) {
  const key = process.env.RESEND_API_KEY;
  const to = session.customer_details?.email;
  if (!key || !to) return false;
  const digital = lines.some((l) => l.item.files.length);
  const list = lines.map(({ item, qty }) => `- ${label(item)}${item.shipped ? ` (qty ${qty})` : ''}`).join('\n');
  const text = [
    'Thanks for your order from Justice Engineering.',
    '',
    list,
    '',
    digital ? `Download your files here (this link is yours; please don't share it):\n${orderUrl}` : `Your order page:\n${orderUrl}`,
    lines.some((l) => l.item.shipped) ? '\nPhysical items ship from New York by USPS. You’ll get tracking when they go out.' : '',
    '',
    'Questions or a problem with a file: reply to this email.',
    '',
    'Justice Engineering',
    'https://justice.engineering',
  ].join('\n');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-${session.id}` },
    body: JSON.stringify({
      from: process.env.SHOP_EMAIL_FROM ?? 'Justice Engineering <shop@justice.engineering>',
      reply_to: 'work@justice.engineering',
      to: [to],
      subject: digital ? 'Your Justice Engineering downloads' : 'Your Justice Engineering order',
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status}: ${await res.text()}`);
  return true;
}
