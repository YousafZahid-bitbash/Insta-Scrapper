type NowPaymentsCurrency = {
  currency: string;
  min_amount?: number;
  max_amount?: number;
  // add other fields if needed
};

import { NextRequest, NextResponse } from 'next/server';

// Minimal mapping for common currencies; extend as needed
const CURRENCY_NAMES: Record<string, string> = {
  btc: 'Bitcoin',
  eth: 'Ethereum',
  xmr: 'Monero',
  zec: 'Zcash',
  xvg: 'Verge',
  ada: 'Cardano',
  ltc: 'Litecoin',
  bch: 'Bitcoin Cash',
  qtum: 'Qtum',
  dash: 'Dash',
  xlm: 'Stellar',
  xrp: 'Ripple',
  xem: 'NEM',
  dgb: 'DigiByte',
  lsk: 'Lisk',
  doge: 'Dogecoin',
  trx: 'TRON',
  kmd: 'Komodo',
  rep: 'Augur',
  bat: 'Basic Attention Token',
  ark: 'Ark',
  waves: 'Waves',
  bnb: 'Binance Coin',
  xzc: 'Zcoin',
  nano: 'Nano',
  tusd: 'TrueUSD',
  vet: 'VeChain',
  zen: 'Horizen',
  grs: 'Groestlcoin',
  fun: 'FunFair',
  neo: 'NEO',
  gas: 'GAS',
  pax: 'Paxos Standard',
  usdc: 'USD Coin',
  ont: 'Ontology',
  xtz: 'Tezos',
  link: 'Chainlink',
  rvn: 'Ravencoin',
  bnbmainnet: 'Binance Coin (Mainnet)',
  zil: 'Zilliqa',
  bcd: 'Bitcoin Diamond',
  usdt: 'Tether',
  usdterc20: 'Tether (ERC20)',
  cro: 'Crypto.com Coin',
  dai: 'Dai',
  ht: 'Huobi Token',
  wabi: 'Tael',
  busd: 'Binance USD',
  algo: 'Algorand',
  usdttrc20: 'Tether (TRC20)',
  gt: 'GateToken',
  stpt: 'STP Network',
  ava: 'Travala.com',
  sxp: 'Swipe',
  uni: 'Uniswap',
  okb: 'OKB',
};

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY!;

// Accept price_amount as a query param for filtering
export async function GET(req: NextRequest) {
  try {
    // Default to 200 if not provided
    const { searchParams } = new URL(req.url);
    const priceAmount = parseFloat(searchParams.get('price_amount') || '200');
    console.log('[NOWPayments] Fetching supported currencies...');
    const url = 'https://api.nowpayments.io/v1/currencies?fixed_rate=true';
    console.log('[NOWPayments] Request URL:', url);
    if (!NOWPAYMENTS_API_KEY) {
      console.error('[NOWPayments] API key is missing!');
      return NextResponse.json({ error: 'NOWPayments API key is missing' }, { status: 500 });
    }
    const response = await fetch(url, {
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
      },
    });
    console.log('[NOWPayments] Response status:', response.status);
    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error('[NOWPayments] Failed to parse JSON:', jsonErr);
      return NextResponse.json({ error: 'Failed to parse NOWPayments response' }, { status: 500 });
    }
    if (!response.ok) {
      console.error('[NOWPayments] API error:', data);
      return NextResponse.json({ error: data.message || 'Failed to fetch currencies' }, { status: 500 });
    }
    if (!data.currencies) {
      console.error('[NOWPayments] No currencies field in response:', data);
      return NextResponse.json({ error: 'No currencies returned from NOWPayments' }, { status: 500 });
    }
    // Debug: Log min/max for each currency if available
    if (Array.isArray(data.currencies) && typeof data.currencies[0] === 'object' && data.currencies[0].currency) {
      data.currencies.forEach((c: NowPaymentsCurrency) => {
        console.log(`[NOWPayments][API] ${c.currency}: min=${c.min_amount}, max=${c.max_amount}`);
      });
    }
    // Map and filter currencies to { ticker, name } objects for frontend compatibility
    let currencies = data.currencies;
    if (Array.isArray(currencies)) {
      if (typeof currencies[0] === 'string') {
        currencies = currencies.map((ticker: string) => ({
          ticker,
          name: CURRENCY_NAMES[ticker.toLowerCase()] || ticker.toUpperCase(),
        }));
      } else if (typeof currencies[0] === 'object' && currencies[0].currency) {
        currencies = currencies
          .filter((c: NowPaymentsCurrency) => {
            // Only include if priceAmount is within min/max
            if (typeof c.min_amount === 'number' && typeof c.max_amount === 'number') {
              return priceAmount >= c.min_amount && priceAmount <= c.max_amount;
            }
            return true;
          })
          .map((c: NowPaymentsCurrency) => ({
            ticker: c.currency,
            name: CURRENCY_NAMES[c.currency.toLowerCase()] || c.currency.toUpperCase(),
          }));
      }
    }
    console.log('[NOWPayments] Filtered currencies for amount', priceAmount, ':', Array.isArray(currencies) ? currencies.length : currencies);
    return NextResponse.json({ currencies });
  } catch (error) {
    console.error('[NOWPayments] Unexpected error:', error);
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}
