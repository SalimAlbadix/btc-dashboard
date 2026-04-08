export const runtime = 'edge';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
      next: { revalidate: 5 },
    });
    if (!res.ok) throw new Error(`Binance error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({
      price: parseFloat(data.lastPrice),
      priceChangeDollar: parseFloat(data.priceChange),
      priceChangePercent: parseFloat(data.priceChangePercent),
      volume24h: parseFloat(data.volume),
      lastUpdated: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}
