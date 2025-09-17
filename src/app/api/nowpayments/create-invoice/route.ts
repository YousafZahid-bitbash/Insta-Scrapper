import { NextRequest, NextResponse } from 'next/server';

// You must set this in your Vercel/Next.js environment variables
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { price_amount, price_currency, pay_currency, order_id, order_description } = await req.json();
    if (!price_amount || !price_currency || !pay_currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Always receive payout in ETH
    const payout_currency = 'usdt';

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount,
        price_currency,
        pay_currency,
        payout_currency,
        order_id,
        order_description,
        ipn_callback_url: process.env.NOWPAYMENTS_WEBHOOK_URL, // Set this in your env
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Failed to create invoice' }, { status: 500 });
    }

    return NextResponse.json({ invoice_url: data.invoice_url, invoice_id: data.id });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
