import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { amount, currency, description } = await req.json();
  const secretKey = process.env.CRYPTO_SECRET_KEY;

  const response = await fetch('https://pay.crypto.com/api/payments', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ amount, currency, description }).toString(),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), { status: 200 });
}
