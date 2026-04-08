'use client';

import { useEffect, useState } from 'react';
import { OverallSignal, PriceData } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  signal: OverallSignal;
  lastSignalChange: number;
  bullishCount: number;
  bearishCount: number;
}

function useLivePrice() {
  const [data, setData] = useState<PriceData | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/price');
        if (res.ok) setData(await res.json());
      } catch {}
    };
    fetchPrice();
    const id = setInterval(fetchPrice, 5000);
    return () => clearInterval(id);
  }, []);

  return data;
}

const SIGNAL_CONFIG: Record<OverallSignal, { label: string; bg: string; text: string; dot: string }> = {
  BUY:  { label: 'BUY',  bg: 'bg-green-500',  text: 'text-white', dot: 'bg-green-400' },
  SELL: { label: 'SELL', bg: 'bg-red-500',    text: 'text-white', dot: 'bg-red-400'   },
  WAIT: { label: 'WAIT', bg: 'bg-amber-400',  text: 'text-white', dot: 'bg-amber-300' },
};

export default function HeroBar({ signal, lastSignalChange, bullishCount, bearishCount }: Props) {
  const priceData = useLivePrice();
  const cfg = SIGNAL_CONFIG[signal];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  const price = priceData?.price ?? null;
  const change = priceData?.priceChangeDollar ?? 0;
  const changePct = priceData?.priceChangePercent ?? 0;
  const isUp = change >= 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {/* Signal badge */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">Bitcoin</p>
          <div className="flex items-baseline gap-3">
            {price !== null ? (
              <span className="text-4xl font-bold text-gray-900 tabular-nums tracking-tight">
                ${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            ) : (
              <span className="text-4xl font-bold text-gray-200 animate-pulse">$——,———</span>
            )}
          </div>
          <div className={`flex items-center gap-1.5 mt-1 text-sm font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>
            <span>{isUp ? '▲' : '▼'}</span>
            <span>
              ${Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-gray-400 font-normal">
              ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
            </span>
            <span className="text-gray-300 font-normal">24h</span>
          </div>
        </div>

        {/* Signal badge */}
        <div className="flex flex-col items-end gap-2">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm tracking-wide ${cfg.bg} ${cfg.text} ${signal === 'BUY' ? 'signal-buy' : signal === 'SELL' ? 'signal-sell' : ''}`}
          >
            <span className={`w-2 h-2 rounded-full ${cfg.dot} opacity-80`} />
            {cfg.label}
          </div>
          <p className="text-xs text-gray-400 text-right">
            {formatDistanceToNow(lastSignalChange, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Trigger alignment bar */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400 font-medium">Triggers</span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => {
            let color = 'bg-gray-200';
            if (i < bullishCount) color = 'bg-green-400';
            else if (i < bullishCount + bearishCount) color = 'bg-red-400';
            return <div key={i} className={`w-5 h-2 rounded-full ${color} transition-colors duration-500`} />;
          })}
        </div>
        <span className="text-xs text-gray-500 ml-1">
          {bullishCount}/5 bullish · {bearishCount}/5 bearish
        </span>
        <span className="ml-auto text-xs text-gray-300">Updates live</span>
      </div>
    </div>
  );
}
