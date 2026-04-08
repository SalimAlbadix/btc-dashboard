'use client';

import { useState } from 'react';
import { Trade, TradeStatus } from '@/lib/types';
import { updateTrade, deleteTrade } from '@/lib/storage';
import { format } from 'date-fns';

interface Props {
  trades: Trade[];
  onUpdate: () => void;
}

function fmt(n: number) {
  return '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

type Filter = 'all' | 'open' | 'closed' | 'stopped';

export default function TradeJournal({ trades, onUpdate }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [showAll, setShowAll] = useState(false);

  const filtered = trades.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'open') return t.status === 'open';
    if (filter === 'closed') return t.status === 'closed';
    if (filter === 'stopped') return t.status === 'stopped';
    return true;
  });

  const displayed = showAll ? filtered : filtered.slice(0, 10);

  const handleClose = (trade: Trade, outcome: 'closed' | 'stopped', exitPrice: number) => {
    const pnl = trade.type === 'BUY'
      ? (exitPrice - trade.entryPrice) * (trade.positionSize / trade.entryPrice)
      : (trade.entryPrice - exitPrice) * (trade.positionSize / trade.entryPrice);
    const pnlPct = ((exitPrice - trade.entryPrice) / trade.entryPrice) * (trade.type === 'SELL' ? -1 : 1) * 100;
    updateTrade(trade.id, { status: outcome, exitPrice, pnl, pnlPct });
    onUpdate();
  };

  const handleDelete = (id: string) => {
    deleteTrade(id);
    onUpdate();
  };

  const statusColors: Record<TradeStatus, string> = {
    open:    'bg-blue-100 text-blue-700',
    closed:  'bg-green-100 text-green-700',
    stopped: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Trade Journal</h2>
        <p className="text-xs text-gray-400">{trades.length} total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
        {(['all', 'open', 'closed', 'stopped'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-gray-500">No trades logged yet</p>
          <p className="text-xs text-gray-400 mt-1">Use the BUY/SELL buttons to log trades</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(trade => (
            <TradeRow
              key={trade.id}
              trade={trade}
              onClose={handleClose}
              onDelete={handleDelete}
              statusColors={statusColors}
            />
          ))}
        </div>
      )}

      {filtered.length > 10 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full mt-3 py-2 text-xs text-orange-500 font-semibold hover:text-orange-600"
        >
          {showAll ? 'Show less' : `Show all ${filtered.length} trades`}
        </button>
      )}
    </div>
  );
}

function TradeRow({
  trade,
  onClose,
  onDelete,
  statusColors,
}: {
  trade: Trade;
  onClose: (t: Trade, outcome: 'closed' | 'stopped', exit: number) => void;
  onDelete: (id: string) => void;
  statusColors: Record<TradeStatus, string>;
}) {
  const [showActions, setShowActions] = useState(false);
  const [exitPrice, setExitPrice] = useState('');

  const isOpen = trade.status === 'open';
  const pnl = trade.pnl ?? 0;
  const isBuy = trade.type === 'BUY';

  return (
    <div className="border border-gray-100 rounded-xl p-3">
      <div className="flex items-start gap-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            isBuy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {isBuy ? '↑' : '↓'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900">{trade.type}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[trade.status]}`}>
              {trade.status.toUpperCase()}
            </span>
            {!isOpen && (
              <span className={`text-xs font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'} ml-auto`}>
                {pnl >= 0 ? '+' : ''}{pnl >= 0 ? '+$' : '-$'}{Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
          <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
            <span>Entry: ${trade.entryPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            <span>SL: ${trade.stopLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            <span>TP: ${trade.takeProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            <span className="text-gray-300">
              {format(trade.timestamp, 'MMM d, HH:mm')}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowActions(v => !v)}
          className="text-gray-300 hover:text-gray-500 text-sm flex-shrink-0"
        >
          ⋮
        </button>
      </div>

      {showActions && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {isOpen ? (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Exit price"
                value={exitPrice}
                onChange={e => setExitPrice(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-400"
              />
              <button
                onClick={() => {
                  if (exitPrice) onClose(trade, 'closed', parseFloat(exitPrice));
                }}
                className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                TP Hit
              </button>
              <button
                onClick={() => onClose(trade, 'stopped', trade.stopLoss)}
                className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                SL Hit
              </button>
            </div>
          ) : null}
          <button
            onClick={() => onDelete(trade.id)}
            className="mt-2 text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Delete entry
          </button>
        </div>
      )}
    </div>
  );
}
