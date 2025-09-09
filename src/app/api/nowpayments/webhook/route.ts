import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../supabaseClient';

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


    // Only process successful payments
    if (status === 'finished') {
      const userId = body.user_id || body.userId;
      const coins = parseInt(body.coins || '0');
      const dealId = body.deal_id || null;
      const providerPaymentId = body.invoice_id || orderId;
      const amount = parseFloat(payAmount || '0');
      const currency = payCurrency || 'USD';

      // Log payment in payments table
      try {
        await supabase.from('payments').insert({
          user_id: userId,
          deal_id: dealId,
          provider: 'nowpayments',
          provider_payment_id: providerPaymentId,
          amount,
          currency,
          coins,
          status: 'paid',
          raw_payload: body,
        });
      } catch (err) {
        console.error('[NOWPayments Webhook] Error inserting payment record:', err);
      }

      if (userId && coins > 0) {
        // Get current balance
        const { data: userData, error: getUserError } = await supabase
          .from('users')
          .select('coins')
          .eq('id', userId)
          .single();

        if (!getUserError && userData) {
          const newBalance = (userData.coins || 0) + coins;
          const { error: updateError } = await supabase
            .from('users')
            .update({ coins: newBalance })
            .eq('id', userId);
          if (updateError) {
            console.error('[NOWPayments Webhook] Error updating user coins:', updateError);
          } else {
            console.log(`[NOWPayments Webhook] Updated user ${userId} balance to ${newBalance} coins`);
          }
        } else {
          console.error('[NOWPayments Webhook] User not found or error:', getUserError);
        }
      } else {
        console.warn('[NOWPayments Webhook] Missing userId or coins in webhook body:', body);
      }

      console.log(`[NOWPayments Webhook] Payment complete for order ${orderId}. Amount: ${payAmount} ${payCurrency}, Invoice: ${invoiceId}`);
    } else {
      // Log failed or pending payment
      try {
        await supabase.from('payments').insert({
          user_id: body.user_id || body.userId || null,
          deal_id: body.deal_id || null,
          provider: 'nowpayments',
          provider_payment_id: body.invoice_id || orderId,
          amount: parseFloat(payAmount || '0'),
          currency: payCurrency || 'USD',
          coins: parseInt(body.coins || '0'),
          status: status === 'failed' ? 'failed' : 'pending',
          raw_payload: body,
        });
      } catch (err) {
        console.error('[NOWPayments Webhook] Error inserting failed/pending payment record:', err);
      }
      console.log(`[NOWPayments Webhook] Payment status for order ${orderId}: ${status}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[NOWPayments Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
