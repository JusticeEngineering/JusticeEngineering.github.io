import Stripe from 'stripe';
import { env } from './config.js';

let client: Stripe | undefined;
export const stripe = () => (client ??= new Stripe(env('STRIPE_SECRET_KEY')));

/** Paid, or free through a 100% promotion code. */
export const isPaid = (s: Stripe.Checkout.Session) =>
  s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');

/** Checkout Session ids are long random bearer strings; reject anything else before calling Stripe. */
export const validSessionId = (id: string | null): id is string => !!id && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id);
