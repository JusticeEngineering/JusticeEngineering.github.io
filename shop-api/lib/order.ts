import { catalog, label, taxCode, type Item } from './catalog.js';
import { MAX_LINES, MAX_QTY } from './config.js';

export type Line = { item: Item; qty: number };

/**
 * Reads the cart the site posts: JSON `[{ "key": string, "qty": number }]`.
 * Unknown keys are dropped, repeats are merged, downloads are capped at one each.
 */
export function parseCart(raw: unknown): Line[] {
  let list: unknown;
  try { list = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { throw new OrderError('The cart could not be read.'); }
  if (!Array.isArray(list)) throw new OrderError('The cart could not be read.');
  const lines = new Map<string, Line>();
  for (const entry of list.slice(0, MAX_LINES * 2)) {
    const key = typeof entry?.key === 'string' ? entry.key : '';
    const item = catalog.get(key);
    if (!item) continue;
    const qty = Math.floor(Number(entry.qty));
    if (!(qty >= 1)) continue;
    const total = (lines.get(key)?.qty ?? 0) + qty;
    lines.set(key, { item, qty: item.shipped ? Math.min(total, MAX_QTY) : 1 });
  }
  if (!lines.size) throw new OrderError('Nothing in the cart is for sale right now.');
  if (lines.size > MAX_LINES) throw new OrderError(`A cart can hold up to ${MAX_LINES} different items.`);
  return [...lines.values()];
}

/**
 * Stripe Checkout line items, priced from the catalog, never from the request.
 * With Stripe Tax on, each carries its tax code and tax is added on top of the price.
 */
export const lineItems = (lines: Line[], tax = false) =>
  lines.map(({ item, qty }) => ({
    quantity: qty,
    price_data: {
      currency: 'usd',
      unit_amount: item.unitAmount,
      product_data: { name: label(item), metadata: { key: item.key }, ...(tax && { tax_code: taxCode(item) }) },
      ...(tax && { tax_behavior: 'exclusive' as const }),
    },
  }));

/** What was bought, kept in the Checkout Session's metadata: `key*qty,key*qty`. */
export const encodeItems = (lines: Line[]) => lines.map((l) => `${l.item.key}*${l.qty}`).join(',');

/** Reads `encodeItems` back. Items since removed from the catalog are skipped. */
export function decodeItems(value: string | undefined | null): Line[] {
  if (!value) return [];
  return value.split(',').flatMap((part) => {
    const [key, qty] = part.split('*');
    const item = catalog.get(key);
    return item ? [{ item, qty: Number(qty) || 1 }] : [];
  });
}

export class OrderError extends Error {}
