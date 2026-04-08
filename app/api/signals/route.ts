export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { buildTriggers, computeOverallSignal, SUPPORT_RESISTANCE } from '@/lib/signals';
import { Candle } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function fetchKlines(interval: string, limit: number): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  const raw: unknown[][] = await res.json();
  return raw.map(k => ({
    time: Math.floor((k[0] as number) / 1000),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

export async function GET() {
  try {
    const [ticker, candles] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
        next: { revalidate: 10 },
      }).then(r => r.json()),
      fetchKlines('1d', 250),
    ]);

    const price = parseFloat(ticker.lastPrice);
    const triggers = buildTriggers(candles);
    const { signal, bullishCount, bearishCount } = computeOverallSignal(triggers, price);

    return NextResponse.json({
      price,
      priceChangeDollar: parseFloat(ticker.priceChange),
      priceChangePercent: parseFloat(ticker.priceChangePercent),
      triggers,
      overallSignal: signal,
      supportResistance: SUPPORT_RESISTANCE,
      candles: candles.slice(-90), // last 90 days for chart
      lastUpdated: Date.now(),
      bullishCount,
      bearishCount,
    });
  } catch (err) {
    console.error('signals error:', err);
    return NextResponse.json({ error: 'Failed to compute signals' }, { status: 500 });
  }
}
