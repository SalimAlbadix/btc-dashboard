'use client';

import { useState } from 'react';
import { BacktestResult } from '@/lib/types';
import { format } from 'date-fns';

function MetricCard({
  label,
  value,
  sub,
  pass,
}: {
  label: string;
  value: string;
  sub?: string;
  pass?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 border ${pass === undefined ? 'bg-gray-50 border-gray-100' : pass ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${pass === undefined ? 'text-gray-900' : pass ? 'text-green-700' : 'text-red-700'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function BacktestModule() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/backtest');
      if (!res.ok) throw new Error('Backtest failed');
      setResult(await res.json());
    } catch (e) {
      setError('Backtest failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const passWinRate = result ? result.winRate > 50 : undefined;
  const passRR = result ? result.riskReward > 1.5 : undefined;
  const passDrawdown = result ? result.maxDrawdown < 15 : undefined;
  const allPass = passWinRate && passRR && passDrawdown;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Backtesting</h2>
          <p className="text-xs text-gray-400 mt-0.5">Runs all 5 triggers on 365 days of BTC data</p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Running...' : 'Run Backtest'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {!result && !loading && (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm text-gray-500">Run a backtest on 365 days of historical Bitcoin data</p>
          <p className="text-xs text-gray-400 mt-1">Takes ~10 seconds</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm text-gray-500">Fetching 365 days of data and running simulations...</p>
        </div>
      )}

      {result && (
        <div>
          {/* Pass/Fail banner */}
          <div
            className={`rounded-xl p-3 mb-4 text-center font-bold text-sm ${
              allPass
                ? 'bg-green-500 text-white'
                : 'bg-amber-500 text-white'
            }`}
          >
            {allPass
              ? '✓ System PASSES minimum criteria — ready for paper trading'
              : '⚠ System needs refinement before live trading'}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <MetricCard
              label="Win Rate"
              value={`${result.winRate.toFixed(1)}%`}
              sub="Min required: >50%"
              pass={passWinRate}
            />
            <MetricCard
              label="Risk/Reward"
              value={result.riskReward.toFixed(2)}
              sub="Min required: >1.5"
              pass={passRR}
            />
            <MetricCard
              label="Max Drawdown"
              value={`${result.maxDrawdown.toFixed(1)}%`}
              sub="Max allowed: <15%"
              pass={passDrawdown}
            />
            <MetricCard
              label="Total Return"
              value={`${result.totalReturnPct > 0 ? '+' : ''}${result.totalReturnPct.toFixed(1)}%`}
              sub={`$${result.startCapital.toLocaleString()} → $${result.endCapital.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mb-4 text-center">
            <div>
              <p className="text-sm font-bold text-gray-900">{result.totalTrades}</p>
              <p className="text-xs text-gray-400">Trades</p>
            </div>
            <div>
              <p className="text-sm font-bold text-green-600">{result.wins}</p>
              <p className="text-xs text-gray-400">Wins</p>
            </div>
            <div>
              <p className="text-sm font-bold text-red-600">{result.losses}</p>
              <p className="text-xs text-gray-400">Losses</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">{result.expired}</p>
              <p className="text-xs text-gray-400">Expired</p>
            </div>
          </div>

          {/* Avg win/loss */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Avg Win</p>
              <p className="font-bold text-green-700">+{result.avgWinPct.toFixed(2)}%</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Avg Loss</p>
              <p className="font-bold text-red-700">{result.avgLossPct.toFixed(2)}%</p>
            </div>
          </div>

          {/* Recent trades */}
          {result.trades.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Recent Simulated Trades (last {Math.min(result.trades.length, 20)})
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {result.trades.slice(-20).reverse().map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded-lg">
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      t.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.type === 'BUY' ? '↑' : '↓'}
                    </span>
                    <span className="text-gray-500 flex-shrink-0">{t.date}</span>
                    <span className="text-gray-700">${t.entry.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-700">${t.exit.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    <span className={`ml-auto font-bold flex-shrink-0 ${
                      t.outcome === 'win' ? 'text-green-600' : t.outcome === 'loss' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {t.pnlPct > 0 ? '+' : ''}{t.pnlPct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-800">
              ⚠️ Backtest results don&apos;t guarantee future performance. Slippage, fees, and execution lag
              are not accounted for. Paper trade for 2 weeks before risking real capital.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
