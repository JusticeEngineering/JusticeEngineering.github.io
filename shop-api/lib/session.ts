import type Stripe from 'stripe';
import { decodeItems, type Line } from './order.js';
import { isPaid, stripe, validSessionId } from './stripe.js';

export type Paid = { session: Stripe.Checkout.Session; lines: Line[] };

/** Looks up a paid order by its Checkout Session id; null when it doesn't exist or isn't paid. */
export async function paidOrder(id: string | null): Promise<Paid | null> {
  if (!validSessionId(id)) return null;
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(id);
  } catch (err) {
    if ((err as { type?: string }).type === 'StripeInvalidRequestError') return null; // no such session
    throw err;
  }
  if (!isPaid(session)) return null;
  return { session, lines: decodeItems(session.metadata?.items) };
}
