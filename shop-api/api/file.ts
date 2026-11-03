// GET /api/file?session_id=…&file=… — checks the order includes the file, then redirects to a
// short-lived signed URL on the private Blob store, so the bytes never pass through this function.
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { blobPath } from '../lib/catalog.js';
import { LINK_MINUTES } from '../lib/config.js';
import { message } from '../lib/page.js';
import { paidOrder } from '../lib/session.js';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const file = params.get('file') ?? '';
  try {
    const order = await paidOrder(params.get('session_id'));
    if (!order) return message('Order not found', 'We couldn’t find a paid order for this link.', 404);
    if (!order.lines.some((l) => l.item.files.some((f) => f.file === file))) {
      return message('File not in this order', 'This order doesn’t include that file.', 403);
    }
    const pathname = blobPath(file);
    const validUntil = Date.now() + LINK_MINUTES * 60_000;
    const token = await issueSignedToken({ pathname, operations: ['get'], validUntil });
    const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname, access: 'private', validUntil });
    return new Response(null, { status: 302, headers: { Location: presignedUrl, 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    console.error('file:', err);
    return message('Download unavailable', 'That file couldn’t be fetched just now. Please try again in a minute.', 503);
  }
}
