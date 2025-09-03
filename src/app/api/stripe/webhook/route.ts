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
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent succeeded:', paymentIntent.id);
      
      try {
        const amount = paymentIntent.amount / 100; // Convert from cents
        const coins = parseInt(paymentIntent.metadata.coins || '0');
        const userId = paymentIntent.metadata.userId;
        const dealName = paymentIntent.metadata.dealName;
        
        console.log(`Payment of $${amount} for ${coins} coins by user ${userId}`);
        
        // 1. Log the transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            payment_intent_id: paymentIntent.id,
            user_id: userId,
            amount: amount,
            coins: coins,
            deal_name: dealName,
            payment_method: 'stripe',
            status: 'completed',
            created_at: new Date().toISOString(),
          });
        
        if (transactionError) {
          console.error('Error logging transaction:', transactionError);
        }
        
        // 2. Update user's coin balance (if userId is provided)
        if (userId && coins > 0) {
          // First get current balance
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
        
        // 3. You could also send confirmation email here
        // await sendConfirmationEmail(userEmail, amount, coins);
        
      } catch (error) {
        console.error('Error processing successful payment:', error);
      }
      
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log('PaymentIntent failed:', failedPayment.id);
      
      // Log failed payment
      try {
        const { error } = await supabase
          .from('transactions')
          .insert({
            payment_intent_id: failedPayment.id,
            user_id: failedPayment.metadata.userId,
            amount: failedPayment.amount / 100,
            coins: parseInt(failedPayment.metadata.coins || '0'),
            deal_name: failedPayment.metadata.dealName,
            payment_method: 'stripe',
            status: 'failed',
            created_at: new Date().toISOString(),
          });
          
        if (error) {
          console.error('Error logging failed transaction:', error);
        }
      } catch (error) {
        console.error('Error processing failed payment:', error);
      }
      
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
