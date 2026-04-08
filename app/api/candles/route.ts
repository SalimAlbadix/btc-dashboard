export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { Candle } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TIMEFRAME_MAP: Record<string, { interval: string; limit: number }> = {
  '1D': { interval: '1h',  limit: 24 },
  '1W': { interval: '4h',  limit: 42 },
  '1M': { interval: '1d',  limit: 30 },
  '3M': { interval: '1d',  limit: 90 },
  '1Y': { interval: '1d',  limit: 365 },
};

export async function GET(req: NextRequest) {
  const tf = req.nextUrl.searchParams.get('tf') ?? '3M';
  const cfg = TIMEFRAME_MAP[tf] ?? TIMEFRAME_MAP['3M'];

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${cfg.interval}&limit=${cfg.limit}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const raw: unknown[][] = await res.json();
    const candles: Candle[] = raw.map(k => ({
      time: Math.floor((k[0] as number) / 1000),
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    }));
    return NextResponse.json({ candles, tf });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch candles' }, { status: 500 });
  }
}
