// Shop settings that aren't per product. Secrets come from environment variables (see README).

/** The public website, where the product pages and cart live. */
export const SITE = 'https://justice.engineering';

/** This service, at shop.justice.engineering. Vercel preview deployments use their own URL. */
export const origin = (request: Request) => new URL(request.url).origin;

/** Flat shipping for orders with anything physical in them. US only. */
export const SHIPPING = { name: 'USPS Ground Advantage', amount: 500, minDays: 2, maxDays: 5 };

export const MAX_QTY = 99;
export const MAX_LINES = 20;

/** How long a download link from the order page works before the buyer has to click again. */
export const LINK_MINUTES = 15;

export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}
