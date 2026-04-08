'use client';

import { useState } from 'react';
import { OverallSignal, Trade } from '@/lib/types';
import dynamic from 'next/dynamic';

const TradeModal = dynamic(() => import('./TradeModal'), { ssr: false });

interface Props {
  signal: OverallSignal;
  price: number;
  onTradeLogged: (trade: Trade) => void;
}

export default function ActionButtons({ signal, price, onTradeLogged }: Props) {
  const [showModal, setShowModal] = useState(false);

  const isActive = signal === 'BUY' || signal === 'SELL';

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => signal === 'BUY' && setShowModal(true)}
          disabled={signal !== 'BUY'}
          className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all ${
            signal === 'BUY'
              ? 'bg-green-500 text-white shadow-lg shadow-green-200 active:scale-95 hover:bg-green-600'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {signal === 'BUY' ? '↑  BUY — Signal Active' : '↑  BUY'}
        </button>
        <button
          onClick={() => signal === 'SELL' && setShowModal(true)}
          disabled={signal !== 'SELL'}
          className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all ${
            signal === 'SELL'
              ? 'bg-red-500 text-white shadow-lg shadow-red-200 active:scale-95 hover:bg-red-600'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {signal === 'SELL' ? '↓  SELL — Signal Active' : '↓  SELL'}
        </button>
      </div>

      {!isActive && (
        <p className="text-center text-xs text-gray-400 mt-2">
          Buttons activate only when all 5 triggers align. Currently: WAIT.
        </p>
      )}

      {showModal && (
        <TradeModal
          signal={signal}
          price={price}
          onClose={() => setShowModal(false)}
          onConfirm={onTradeLogged}
        />
      )}
    </>
  );
}
