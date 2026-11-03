// POST /api/checkout. The site's cart page posts a plain form here (field `items`, JSON);
// we price it from the catalog, open a Stripe Checkout Session and send the browser there.
import type Stripe from 'stripe';
import { SHIPPING, SITE, origin } from '../lib/config.js';
import { OrderError, encodeItems, lineItems, parseCart } from '../lib/order.js';
import { stripe } from '../lib/stripe.js';

const back = (error: string) =>
  Response.redirect(`${SITE}/shop/cart/?error=${encodeURIComponent(error)}`, 303);

export async function POST(request: Request) {
  let lines;
  try {
    const form = await request.formData();
    lines = parseCart(form.get('items'));
  } catch (err) {
    return back(err instanceof OrderError ? err.message : 'The cart could not be read.');
  }
  const items = encodeItems(lines);
  if (items.length > 500) return back('That cart is too large for one order. Please split it.');
  const shipped = lines.some((l) => l.item.shipped);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems(lines),
    metadata: { items },
    // Production returns through the site so it can empty the cart; previews come straight back.
    success_url: process.env.VERCEL_ENV === 'production'
      ? `${SITE}/shop/thanks/?session_id={CHECKOUT_SESSION_ID}`
      : `${origin(request)}/order?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/shop/cart/`,
    allow_promotion_codes: true,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === 'true' },
    ...(shipped && {
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: SHIPPING.name,
          fixed_amount: { amount: SHIPPING.amount, currency: 'usd' },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: SHIPPING.minDays },
            maximum: { unit: 'business_day', value: SHIPPING.maxDays },
          },
        },
      }],
    }),
  };
  try {
    const session = await stripe().checkout.sessions.create(params);
    return Response.redirect(session.url!, 303);
  } catch (err) {
    console.error('checkout:', err);
    return back('Checkout is unavailable right now. Please try again shortly.');
  }
}
