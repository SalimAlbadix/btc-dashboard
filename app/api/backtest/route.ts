export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { buildTriggers, computeOverallSignal } from '@/lib/signals';
import { Candle, BacktestTrade, BacktestResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function fetchKlines(): Promise<Candle[]> {
  const url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=365';
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Binance ${res.status}`);
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
    const candles = await fetchKlines();
    if (candles.length < 210) {
      return NextResponse.json({ error: 'Not enough data' }, { status: 400 });
    }

    const START = 200; // Need 200 candles for MA200
    const TP_PCT = 0.02;  // +2% take profit
    const SL_PCT = 0.02;  // -2% stop loss
    const POSITION_SIZE = 5000;

    const trades: BacktestTrade[] = [];
    let inPosition = false;
    let capital = POSITION_SIZE;

    for (let i = START; i < candles.length - 1; i++) {
      if (inPosition) continue;

      const window = candles.slice(0, i + 1);
      const triggers = buildTriggers(window);
      const { signal } = computeOverallSignal(triggers, window[window.length - 1].close);

      if (signal === 'WAIT') continue;

      const entry = candles[i].close;
      const tp = signal === 'BUY' ? entry * (1 + TP_PCT) : entry * (1 - TP_PCT);
      const sl = signal === 'BUY' ? entry * (1 - SL_PCT) : entry * (1 + SL_PCT);

      // Simulate next days
      let outcome: 'win' | 'loss' | 'expired' = 'expired';
      let exitPrice = entry;
      let daysHeld = 0;

      for (let j = i + 1; j < Math.min(i + 4, candles.length); j++) {
        daysHeld = j - i;
        const c = candles[j];
        if (signal === 'BUY') {
          if (c.high >= tp) { outcome = 'win'; exitPrice = tp; break; }
          if (c.low <= sl)  { outcome = 'loss'; exitPrice = sl; break; }
        } else {
          if (c.low <= tp)  { outcome = 'win'; exitPrice = tp; break; }
          if (c.high >= sl) { outcome = 'loss'; exitPrice = sl; break; }
        }
        // Time stop: 3 days → close at market
        if (j === Math.min(i + 3, candles.length - 1)) {
          exitPrice = c.close;
          const pct = signal === 'BUY'
            ? (exitPrice - entry) / entry
            : (entry - exitPrice) / entry;
          outcome = pct > 0 ? 'win' : 'loss';
        }
      }

      const pnlPct = signal === 'BUY'
        ? (exitPrice - entry) / entry
        : (entry - exitPrice) / entry;
      const pnl = POSITION_SIZE * pnlPct;

      trades.push({
        date: new Date(candles[i].time * 1000).toISOString().split('T')[0],
        type: signal as 'BUY' | 'SELL',
        entry,
        exit: exitPrice,
        pnl,
        pnlPct: pnlPct * 100,
        outcome,
        daysHeld,
      });

      inPosition = false; // simplified: allow next trade immediately
    }

    const wins = trades.filter(t => t.outcome === 'win');
    const losses = trades.filter(t => t.outcome === 'loss');
    const expired = trades.filter(t => t.outcome === 'expired');

    const winRate = trades.length > 0 ? wins.length / trades.length : 0;
    const avgWinPct = wins.length > 0 ? wins.reduce((a, t) => a + t.pnlPct, 0) / wins.length : 0;
    const avgLossPct = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + t.pnlPct, 0) / losses.length) : 1;
    const riskReward = avgLossPct > 0 ? Math.abs(avgWinPct) / avgLossPct : 0;

    // Max drawdown
    let peak = POSITION_SIZE;
    let maxDrawdown = 0;
    let runningCapital = POSITION_SIZE;
    for (const t of trades) {
      runningCapital += t.pnl;
      if (runningCapital > peak) peak = runningCapital;
      const dd = (peak - runningCapital) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const totalPnl = trades.reduce((a, t) => a + t.pnl, 0);
    const endCapital = POSITION_SIZE + totalPnl;
    const totalReturnPct = (totalPnl / POSITION_SIZE) * 100;

    const result: BacktestResult = {
      totalTrades: trades.length,
      buySignals: trades.filter(t => t.type === 'BUY').length,
      sellSignals: trades.filter(t => t.type === 'SELL').length,
      wins: wins.length,
      losses: losses.length,
      expired: expired.length,
      winRate: winRate * 100,
      avgWinPct,
      avgLossPct: -avgLossPct,
      riskReward,
      maxDrawdown: maxDrawdown * 100,
      totalReturnPct,
      trades: trades.slice(-50), // last 50 trades
      startCapital: POSITION_SIZE,
      endCapital,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('backtest error:', err);
    return NextResponse.json({ error: 'Backtest failed' }, { status: 500 });
  }
}
