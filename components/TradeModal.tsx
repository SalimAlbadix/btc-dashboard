'use client';

import { useState } from 'react';
import { Trade, OverallSignal } from '@/lib/types';
import { saveTrade, getPositionState } from '@/lib/storage';

interface Props {
  signal: OverallSignal;
  price: number;
  onClose: () => void;
  onConfirm: (trade: Trade) => void;
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function TradeModal({ signal, price, onClose, onConfirm }: Props) {
  const state = getPositionState();
  const posSize = state.consecutiveLosses >= 2 ? 3000 : state.consecutiveWins >= 5 ? 10000 : state.consecutiveWins >= 3 ? 7500 : 5000;

  const tp1 = signal === 'BUY' ? price * 1.02 : price * 0.98;
  const tp2 = signal === 'BUY' ? price * 1.03 : price * 0.97;
  const sl  = signal === 'BUY' ? price * 0.98 : price * 1.02;

  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    const trade: Trade = {
      id: `trade_${Date.now()}`,
      timestamp: Date.now(),
      type: signal as 'BUY' | 'SELL',
      entryPrice: price,
      positionSize: posSize,
      stopLoss: sl,
      takeProfit: tp1,
      takeProfit2: tp2,
      status: 'open',
      triggersActive: ['MA', 'RSI', 'MACD', 'Volume', 'S/R'],
      notes,
    };
    saveTrade(trade);
    onConfirm(trade);
    onClose();
  };

  const isBuy = signal === 'BUY';
  const accentBg = isBuy ? 'bg-green-500' : 'bg-red-500';
  const accentText = isBuy ? 'text-green-700' : 'text-red-700';
  const accentBorder = isBuy ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md mx-auto p-6 animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center`}>
              <span className="text-white font-bold text-sm">{signal}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">Confirm Trade</p>
              <p className="text-xs text-gray-500">{isBuy ? 'Long position' : 'Short position'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Trade details */}
        <div className={`rounded-xl border p-4 mb-4 ${accentBorder}`}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Entry Price</p>
              <p className="font-bold text-gray-900">{fmt(price)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Position Size</p>
              <p className="font-bold text-gray-900">{fmt(posSize)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Take Profit 1 (+2%)</p>
              <p className={`font-bold ${accentText}`}>{fmt(tp1)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Take Profit 2 (+3%)</p>
              <p className={`font-bold ${accentText}`}>{fmt(tp2)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-0.5">Stop Loss (-2%) — SET BEFORE ENTERING</p>
              <p className="font-bold text-red-600">{fmt(sl)}</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-amber-800 font-medium">
            ⚠️ Reminder: Close 50% at +2%. Hard stop at -2%. Time stop: close if not profitable in 24h.
          </p>
        </div>

        <textarea
          placeholder="Notes (optional)..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 resize-none mb-4"
          rows={2}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all active:scale-95 ${accentBg} hover:opacity-90`}
          >
            {signal === 'BUY' ? 'Log BUY Trade' : 'Log SELL Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}
