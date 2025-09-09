import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook asdError: ${errorMessage}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      try {
        const amount = paymentIntent.amount / 100;
        const coins = parseInt(paymentIntent.metadata.coins || '0');
        const userId = paymentIntent.metadata.userId;
        const dealId = paymentIntent.metadata.dealId || null;
        const providerPaymentId = paymentIntent.id;
        const currency = paymentIntent.currency ? paymentIntent.currency.toUpperCase() : 'USD';

        // Log payment in payments table
        await supabase.from('payments').insert({
          user_id: userId,
          deal_id: dealId,
          provider: 'stripe',
          provider_payment_id: providerPaymentId,
          amount,
          currency,
          coins,
          status: 'paid',
          raw_payload: paymentIntent,
        });

        // Update user's coin balance
        if (userId && coins > 0) {
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
              console.error('Error updating user coins:', updateError);
            } else {
              console.log(`Updated user ${userId} balance to ${newBalance} coins`);
            }
          }
        }
      } catch (error) {
        console.error('Error processing successful payment:', error);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent failed:', failedPayment.id);
      try {
        const amount = failedPayment.amount / 100;
        const coins = parseInt(failedPayment.metadata.coins || '0');
        const userId = failedPayment.metadata.userId;
        const dealId = failedPayment.metadata.dealId || null;
        const providerPaymentId = failedPayment.id;
        const currency = failedPayment.currency ? failedPayment.currency.toUpperCase() : 'USD';

        // Log failed payment in payments table
        await supabase.from('payments').insert({
          user_id: userId,
          deal_id: dealId,
          provider: 'stripe',
          provider_payment_id: providerPaymentId,
          amount,
          currency,
          coins,
          status: 'failed',
          raw_payload: failedPayment,
        });
      } catch (error) {
        console.error('Error processing failed payment:', error);
      }
      break;
    }
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
