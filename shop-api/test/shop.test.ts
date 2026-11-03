import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/catalog.generated.js', () => import('./fixture.js'));

const sessions = { create: vi.fn(), retrieve: vi.fn() };
const webhooks = { constructEventAsync: vi.fn() };
vi.mock('stripe', () => ({ default: class { checkout = { sessions }; webhooks = webhooks; } }));

const blob = { issueSignedToken: vi.fn(), presignUrl: vi.fn() };
vi.mock('@vercel/blob', () => blob);

const { parseCart, encodeItems, decodeItems } = await import('../lib/order.js');
const checkout = await import('../api/checkout.js');
const order = await import('../api/order.js');
const file = await import('../api/file.js');
const webhook = await import('../api/webhook.js');

const SID = 'cs_test_a1B2c3D4e5F6g7H8i9J0';
const paid = (items: string, extra = {}) => ({
  id: SID, status: 'complete', payment_status: 'paid', metadata: { items },
  customer_details: { email: 'buyer@example.com' }, ...extra,
});
const post = (items: unknown) => {
  const body = new FormData();
  body.set('items', typeof items === 'string' ? items : JSON.stringify(items));
  return new Request('https://shop.justice.engineering/api/checkout', { method: 'POST', body });
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  delete process.env.VERCEL_ENV;
  delete process.env.RESEND_API_KEY;
});

describe('parseCart', () => {
  it('prices from the catalog, merges repeats, caps downloads at one and drops unknown keys', () => {
    const lines = parseCart(JSON.stringify([
      { key: 'model-a', qty: 3, unitAmount: 1 }, { key: 'pencil', qty: 2 }, { key: 'pencil', qty: 1 },
      { key: 'nope', qty: 1 }, { key: 'model-b-glb', qty: 0 },
    ]));
    expect(lines.map((l) => [l.item.key, l.qty, l.item.unitAmount])).toEqual([['model-a', 1, 2900], ['pencil', 3, 400]]);
  });
  it('rejects junk and empty carts', () => {
    expect(() => parseCart('{')).toThrow('could not be read');
    expect(() => parseCart('[{"key":"nope","qty":1}]')).toThrow('Nothing in the cart');
  });
  it('round-trips through session metadata', () => {
    const lines = parseCart([{ key: 'model-b-blender', qty: 1 }, { key: 'pencil', qty: 4 }]);
    expect(encodeItems(lines)).toBe('model-b-blender*1,pencil*4');
    expect(decodeItems('model-b-blender*1,gone*1,pencil*4').map((l) => [l.item.key, l.qty])).toEqual([['model-b-blender', 1], ['pencil', 4]]);
  });
});

describe('POST /api/checkout', () => {
  it('opens a download-only session without shipping and redirects to Stripe', async () => {
    sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const res = await checkout.POST(post([{ key: 'model-a', qty: 1 }]));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    const params = sessions.create.mock.calls[0][0];
    expect(params.line_items).toEqual([{ quantity: 1, price_data: { currency: 'usd', unit_amount: 2900, product_data: { name: 'Model A', metadata: { key: 'model-a' } } } }]);
    expect(params.metadata).toEqual({ items: 'model-a*1' });
    expect(params.shipping_address_collection).toBeUndefined();
    expect(params.success_url).toBe('https://shop.justice.engineering/order?session_id={CHECKOUT_SESSION_ID}');
    expect(params.automatic_tax).toEqual({ enabled: false });
  });
  it('asks for a US address and adds shipping when a physical item is in the cart', async () => {
    process.env.VERCEL_ENV = 'production';
    sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    await checkout.POST(post([{ key: 'pencil', qty: 2 }, { key: 'model-b-glb', qty: 1 }]));
    const params = sessions.create.mock.calls[0][0];
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ['US'] });
    expect(params.shipping_options[0].shipping_rate_data.fixed_amount.amount).toBe(500);
    expect(params.success_url).toBe('https://justice.engineering/shop/thanks/?session_id={CHECKOUT_SESSION_ID}');
  });
  it('sends the buyer back to the cart with a reason when nothing is for sale', async () => {
    const res = await checkout.POST(post([{ key: 'nope', qty: 1 }]));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toMatch(/^https:\/\/justice\.engineering\/shop\/cart\/\?error=Nothing/);
    expect(sessions.create).not.toHaveBeenCalled();
  });
  it('reports a Stripe outage on the cart page', async () => {
    sessions.create.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await checkout.POST(post([{ key: 'model-a', qty: 1 }]));
    expect(res.headers.get('location')).toMatch(/error=Checkout%20is%20unavailable/);
  });
});

describe('GET /order', () => {
  const get = (id: string) => order.GET(new Request(`https://shop.justice.engineering/order?session_id=${id}`));
  it('lists files for a paid order, with escaping', async () => {
    sessions.retrieve.mockResolvedValue(paid('model-b-glb*1,pencil*2', {
      collected_information: { shipping_details: { address: { line1: '1 <Main> St', city: 'Albany', state: 'NY', postal_code: '12207' } } },
    }));
    const res = await get(SID);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const html = await res.text();
    expect(html).toContain(`/api/file?session_id=${SID}&amp;file=B_Realtime.zip`);
    expect(html).toContain('Model B, GLB');
    expect(html).toContain('Qty 2. Ships from New York');
    expect(html).toContain('1 &lt;Main&gt; St, Albany, NY, 12207');
    expect(html).not.toContain('A.zip');
  });
  it('refuses unpaid, unknown and malformed sessions without leaking anything', async () => {
    sessions.retrieve.mockResolvedValueOnce(paid('model-a*1', { payment_status: 'unpaid', status: 'open' }));
    expect((await get(SID)).status).toBe(404);
    sessions.retrieve.mockRejectedValueOnce(Object.assign(new Error('No such session'), { type: 'StripeInvalidRequestError' }));
    expect((await get(SID)).status).toBe(404);
    expect((await get('../etc')).status).toBe(404);
    expect(sessions.retrieve).toHaveBeenCalledTimes(2);
  });
});

describe('GET /api/file', () => {
  const get = (f: string) => file.GET(new Request(`https://shop.justice.engineering/api/file?session_id=${SID}&file=${encodeURIComponent(f)}`));
  it('redirects to a short-lived signed URL for a purchased file', async () => {
    sessions.retrieve.mockResolvedValue(paid('model-b-blender*1'));
    blob.issueSignedToken.mockResolvedValue({ delegationToken: 'd', clientSigningToken: 's' });
    blob.presignUrl.mockResolvedValue({ presignedUrl: 'https://store.private.blob.vercel-storage.com/downloads/B_Detailed.zip?sig=1' });
    const res = await get('B_Detailed.zip');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('B_Detailed.zip?sig=1');
    const tokenOpts = blob.issueSignedToken.mock.calls[0][0];
    expect(tokenOpts).toMatchObject({ pathname: 'downloads/B_Detailed.zip', operations: ['get'] });
    expect(tokenOpts.validUntil - Date.now()).toBeLessThanOrEqual(15 * 60_000);
    expect(blob.presignUrl.mock.calls[0][1]).toMatchObject({ operation: 'get', pathname: 'downloads/B_Detailed.zip', access: 'private' });
  });
  it('refuses files the order does not include, including path tricks', async () => {
    sessions.retrieve.mockResolvedValue(paid('model-b-blender*1'));
    expect((await get('B_Realtime.zip')).status).toBe(403);
    expect((await get('../B_Detailed.zip')).status).toBe(403);
    expect(blob.issueSignedToken).not.toHaveBeenCalled();
  });
});

describe('POST /api/webhook', () => {
  const hook = () => webhook.POST(new Request('https://shop.justice.engineering/api/webhook', {
    method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=x' },
  }));
  it('rejects a bad signature', async () => {
    webhooks.constructEventAsync.mockRejectedValue(new Error('bad'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await hook()).status).toBe(400);
  });
  it('emails the order link once paid, through Resend', async () => {
    process.env.RESEND_API_KEY = 're_x';
    webhooks.constructEventAsync.mockResolvedValue({ type: 'checkout.session.completed', data: { object: paid('model-a*1') } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    expect((await hook()).status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(['buyer@example.com']);
    expect(body.text).toContain(`https://shop.justice.engineering/order?session_id=${SID}`);
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe(`order-${SID}`);
    fetchMock.mockRestore();
  });
  it('sends nothing for an unpaid (pending bank debit) checkout', async () => {
    process.env.RESEND_API_KEY = 're_x';
    webhooks.constructEventAsync.mockResolvedValue({ type: 'checkout.session.completed', data: { object: paid('model-a*1', { payment_status: 'unpaid' }) } });
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    expect((await hook()).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
