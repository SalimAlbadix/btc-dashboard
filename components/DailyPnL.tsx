'use client';

import { PositionState, Trade } from '@/lib/types';

interface Props {
  state: PositionState;
  trades: Trade[];
}

const DAILY_LOSS_LIMIT = 10000;

function fmt(n: number, showSign = true) {
  const prefix = showSign && n > 0 ? '+' : '';
  return prefix + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DailyPnL({ state, trades }: Props) {
  const todayTrades = trades.filter(t => {
    const d = new Date(t.timestamp);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const closedToday = todayTrades.filter(t => t.status === 'closed' || t.status === 'stopped');
  const dailyPnl = closedToday.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const wins = closedToday.filter(t => (t.pnl ?? 0) > 0).length;
  const losses = closedToday.filter(t => (t.pnl ?? 0) <= 0).length;

  const lossRatio = Math.abs(Math.min(0, dailyPnl)) / DAILY_LOSS_LIMIT;
  const isNearLimit = lossRatio > 0.7;
  const isAtLimit = lossRatio >= 1;

  const pnlColor = dailyPnl > 0 ? 'text-green-600' : dailyPnl < 0 ? 'text-red-600' : 'text-gray-700';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 className="font-semibold text-gray-900 mb-3">Daily P&amp;L</h2>

      {isAtLimit && (
        <div className="bg-red-500 text-white rounded-xl p-3 mb-3 font-bold text-sm text-center">
          🛑 DAILY LOSS LIMIT HIT — STOP TRADING
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl p-3 mb-3 text-xs font-semibold">
          ⚠️ Approaching daily loss limit ({Math.round(lossRatio * 100)}% used)
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className={`text-2xl font-bold tabular-nums ${pnlColor}`}>{fmt(dailyPnl)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Today's P&amp;L</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{todayTrades.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Trades</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {closedToday.length > 0 ? (
              <span>
                <span className="text-green-500">{wins}</span>
                <span className="text-gray-300 text-lg">/</span>
                <span className="text-red-500">{losses}</span>
              </span>
            ) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">W/L</p>
        </div>
      </div>

      {/* Loss limit bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Daily loss limit</span>
          <span>{Math.round(lossRatio * 100)}% used</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              lossRatio > 0.7 ? 'bg-red-500' : lossRatio > 0.4 ? 'bg-amber-400' : 'bg-green-400'
            }`}
            style={{ width: `${Math.min(lossRatio * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">
          Max: $10,000/day
        </p>
      </div>
    </div>
  );
}
