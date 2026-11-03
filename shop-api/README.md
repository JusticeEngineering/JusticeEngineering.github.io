# Shop service

The checkout and download service for the shop on justice.engineering, deployed on Vercel at
**shop.justice.engineering**. Payments go through Stripe Checkout and the download ZIPs live in a
private Vercel Blob store. There is no database: Stripe keeps the orders.

## How it works

1. Product pages and prices live in the site's `_products/*.md`. On every deploy,
   `scripts/build-catalog.mjs` reads them into `lib/catalog.generated.ts`. That catalog sets which
   item keys exist, what each costs and which files each unlocks. The browser only sends keys and
   quantities, and prices are always taken from the catalog.
2. The cart page posts a form to `POST /api/checkout`. The service opens a Stripe Checkout Session
   with the items stored in its metadata, then redirects the buyer to Stripe. A US address and flat
   shipping are added only when something physical is in the cart.
3. After payment, Stripe sends the buyer to `justice.engineering/shop/thanks/`, which empties the
   cart and opens `shop.justice.engineering/order?session_id=…`. That page checks that the session
   is paid and lists the files.
4. Each file link, `/api/file`, checks that the order includes that file, then redirects to a Blob
   URL signed for 15 minutes. The ZIP downloads straight from Blob storage.
5. The `checkout.session.completed` webhook emails the buyer the order link, but only if Resend is
   set up. Stripe's own receipt is sent either way.

The order link is the buyer's credential, the same way a Shopify download link is. It doesn't
expire, so buyers get later fixes to the same item key.

## Selling something

In the product's front matter:

- `price: 29` is in US dollars. If it's empty, the product isn't for sale.
- A product sold as one item uses its `handle` as the item key, and the item includes every file
  listed in `downloads`.
- To sell editions separately, add `skus:`, each with a `key`, a `name`, an optional `price` (it
  falls back to the product's) and its `files`. See `_products/honda-xr650r.md`.
- Remove `published: false`.

Once anything has sold, keep its item key. Orders find their files by key, so renaming or deleting
a key cuts off those buyers' downloads. A new version can point the same key at new files.

Shipping is set once in `lib/config.ts`: flat rate, US only.

## One-time setup

1. **Stripe.** Create the account and finish identity and bank verification. Under Settings,
   Customer emails, turn on "Successful payments" so buyers get receipts. Copy the secret key, using
   the test key first.
2. **Vercel project.** Choose Add New, then Project, and pick this repository. Set **Root
   Directory** to `shop-api` and the Framework Preset to "Other". The build command and output
   folder come from `vercel.json`.
3. **Blob store.** In the project, open Storage, choose Create, then Blob, and set Access to
   **Private**. Connect it to all environments.
4. **Environment variables** (Settings, Environment Variables):
   - `STRIPE_SECRET_KEY`: use `sk_test_…` in Preview and `sk_live_…` in Production.
   - `STRIPE_WEBHOOK_SECRET`: from step 6.
   - `RESEND_API_KEY` (optional): emails buyers their order link. Resend's free plan covers
     3,000 emails a month. Verify justice.engineering in Resend first.
   - `STRIPE_AUTOMATIC_TAX=true` (optional): turns on Stripe Tax, which costs 0.5% per sale where
     you're registered.
   - `SHOP_INCLUDE_UNPUBLISHED=1` (Preview only): lets you test unpublished products.
5. **Domain.** Under Settings, Domains, add `shop.justice.engineering`. Then add the CNAME record
   Vercel shows at your DNS host.
6. **Webhook.** In Stripe, open Developers, then Webhooks, and add the endpoint
   `https://shop.justice.engineering/api/webhook` for the events `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`. Make one endpoint in test mode and one in live mode.
7. **Upload the files.** From this folder on the machine that has the ZIPs:

   ```sh
   npm install
   npx vercel link && npx vercel env pull .env.local
   npm run upload -- ~/Documents/ChatGPT/2LT/output/shop_2026-10-20_r1
   ```

   This checks every ZIP's SHA-256 against `_products/` before uploading, and skips files that are
   already there.

## Development

```sh
npm install
npm test           # handlers against a mocked Stripe and Blob
npm run typecheck
```
