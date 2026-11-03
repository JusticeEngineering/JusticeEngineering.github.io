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
  files: File[];
};

export const catalog: ReadonlyMap<string, Item> = new Map(items.map((i) => [i.key, i]));

export const label = (i: Item) => (i.name ? `${i.product}, ${i.name}` : i.product);

/** Where a download lives in the private Blob store. */
export const blobPath = (file: string) => `downloads/${file}`;
