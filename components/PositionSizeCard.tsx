'use client';

import { PositionState, Trade } from '@/lib/types';
import { getRecommendedPositionSize } from '@/lib/storage';

interface Props {
  state: PositionState;
  openTrades: Trade[];
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US');
}

export default function PositionSizeCard({ state, openTrades }: Props) {
  const recommended = getRecommendedPositionSize(state);

  let streakLabel = '';
  let streakColor = 'text-gray-500';
  if (state.consecutiveWins > 0) {
    streakLabel = `Win streak: ${state.consecutiveWins}`;
    streakColor = 'text-green-600';
  } else if (state.consecutiveLosses > 0) {
    streakLabel = `Loss streak: ${state.consecutiveLosses}`;
    streakColor = 'text-red-600';
  } else {
    streakLabel = 'No streak';
    streakColor = 'text-gray-500';
  }

  let nextTier = '';
  if (state.consecutiveLosses >= 2) {
    nextTier = 'Return to $5,000 after a win';
  } else if (state.consecutiveWins >= 5) {
    nextTier = '$10,000 (max reached)';
  } else if (state.consecutiveWins >= 3) {
    nextTier = '2 more wins → $10,000 cap';
  } else {
    nextTier = `${3 - state.consecutiveWins} more wins → $7,500`;
  }

  const isPaused = state.paused && state.pausedUntil && state.pausedUntil > Date.now();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h2 className="font-semibold text-gray-900 mb-3">Position Sizing</h2>

      {isPaused && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
          <p className="text-sm font-bold text-red-700">STOP TRADING</p>
          <p className="text-xs text-red-600 mt-0.5">
            3 consecutive losses. Review the system. Resume trading after 48h.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Recommended Size</p>
          <p className="text-xl font-bold text-orange-600">{fmt(recommended)}</p>
          <p className="text-xs text-gray-400 mt-0.5">per trade</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Current Streak</p>
          <p className={`text-base font-bold ${streakColor}`}>{streakLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">{nextTier}</p>
        </div>
      </div>

      {openTrades.length > 0 && (
        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">
            {openTrades.length} Open Position{openTrades.length > 1 ? 's' : ''}
          </p>
          {openTrades.map(t => (
            <div key={t.id} className="flex items-center justify-between text-xs text-blue-600">
              <span>{t.type} @ ${t.entryPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              <span>SL: ${t.stopLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
          {openTrades.length >= 2 && (
            <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Max 2 positions reached</p>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Risk: 2% per trade · Daily max loss: $10,000 · Never average down
        </p>
      </div>
    </div>
  );
}
