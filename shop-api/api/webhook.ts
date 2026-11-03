// POST /api/webhook — Stripe events. On a paid checkout, emails the buyer their order link.
import { env, origin } from '../lib/config.js';
import { sendOrderEmail } from '../lib/email.js';
import { decodeItems } from '../lib/order.js';
import { isPaid, stripe } from '../lib/stripe.js';

export async function POST(request: Request) {
  const body = await request.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, request.headers.get('stripe-signature') ?? '', env('STRIPE_WEBHOOK_SECRET'));
  } catch (err) {
    console.error('webhook signature:', err);
    return new Response('Bad signature', { status: 400 });
  }
  // Card payments complete at once; bank debits succeed later, in a second event.
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    if (isPaid(session)) {
      const lines = decodeItems(session.metadata?.items);
      try {
        await sendOrderEmail(session, lines, `${origin(request)}/order?session_id=${encodeURIComponent(session.id)}`);
      } catch (err) {
        console.error('webhook email:', err);
        return new Response('Email failed', { status: 500 }); // Stripe retries
      }
    }
  }
  return new Response('ok');
}
