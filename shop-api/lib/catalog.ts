import { items } from './catalog.generated.js';

export type File = { file: string; bytes: number; sha256: string };

/** One thing a buyer can put in the cart: a product, or one edition of it. */
export type Item = {
  key: string;
  product: string;
  /** Edition name; empty when the product is sold as one item. */
  name: string;
  /** Product page path on justice.engineering. */
  url: string;
  /** US cents. */
  unitAmount: number;
  shipped: boolean;
  /** Stripe Tax product code; see taxCode(). */
  taxCode?: string;
  files: File[];
};

export const catalog: ReadonlyMap<string, Item> = new Map(items.map((i) => [i.key, i]));

export const label = (i: Item) => (i.name ? `${i.product}, ${i.name}` : i.product);

/**
 * Stripe Tax product code. Front matter `tax_code` overrides; otherwise general tangible goods for
 * shipped items and Stripe's general digital code (taxed like downloaded music) for downloads.
 * https://docs.stripe.com/tax/tax-codes
 */
export const taxCode = (i: Item) => i.taxCode ?? (i.shipped ? 'txcd_99999999' : 'txcd_10000000');

/** Where a download lives in the private Blob store. */
export const blobPath = (file: string) => `downloads/${file}`;
