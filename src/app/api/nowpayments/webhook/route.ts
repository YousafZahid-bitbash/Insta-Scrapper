import { NextRequest, NextResponse } from 'next/server';

const NOWPAYMENTS_IPN_KEY = process.env.NOWPAYMENTS_IPN_KEY;

// This endpoint receives webhook notifications from NOWPayments
export async function POST(req: NextRequest) {
  try {
    // Verify IPN key from header
    const sig = req.headers.get('x-nowpayments-sig');
    if (!NOWPAYMENTS_IPN_KEY) {
      console.error('[NOWPayments Webhook] IPN key is not set in environment variables.');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    if (!sig || sig !== NOWPAYMENTS_IPN_KEY) {
      console.warn('[NOWPayments Webhook] Invalid or missing IPN signature:', sig);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[NOWPayments Webhook] Received:', body);

    // Check payment status
    const status = body.payment_status;
    const orderId = body.order_id;
    const payAmount = body.pay_amount;
    const payCurrency = body.pay_currency;
    const invoiceId = body.invoice_id;

    // Example: Only process successful payments
    if (status === 'finished') {
      // TODO: Update your database to mark the order as paid/credit user
      console.log(`[NOWPayments Webhook] Payment complete for order ${orderId}. Amount: ${payAmount} ${payCurrency}, Invoice: ${invoiceId}`);
      // ...update DB logic here...
    } else {
      console.log(`[NOWPayments Webhook] Payment status for order ${orderId}: ${status}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[NOWPayments Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
