// GET /order?session_id=… — the buyer's order page with download links. Stripe's success
// redirect lands here, and the receipt email links here. The session id is the credential.
import { message, orderPage } from '../lib/page.js';
import { paidOrder } from '../lib/session.js';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('session_id');
  try {
    const order = await paidOrder(id);
    if (!order) return message('Order not found', 'We couldn’t find a paid order for this link.', 404);
    return orderPage(order.session, order.lines);
  } catch (err) {
    console.error('order:', err);
    return message('Something went wrong', 'Your order couldn’t be loaded just now. Please reload in a minute.', 503);
  }
}
