'use client';

import { useState } from 'react';
import { TriggerData, TriggerStatus } from '@/lib/types';

interface Props {
  triggers: TriggerData;
  signal: 'BUY' | 'SELL' | 'WAIT';
}

const TRIGGER_TOOLTIPS: Record<string, string> = {
  ma: "This shows if Bitcoin is in a healthy uptrend or downtrend. Green means uptrend — buyers are in control. Red means downtrend — sellers are in control. We only buy when it's green.",
  rsi: "This tells us if Bitcoin is tired or rested. If it's tired (above 70), it might fall down soon. If it's well-rested (below 30), it might bounce up. We trade when it's in the middle.",
  macd: "This shows if Bitcoin is speeding up or slowing down. Green and growing means it's speeding up — good time to buy. Red and growing means it's falling fast — good time to sell or wait.",
  volume: "This shows how many people are trading right now. If lots of people are trading, the move is real. If only a few people are trading, the move is fake. We only trade real moves.",
  support: "These are price levels where Bitcoin usually stops and bounces. Support is the floor — Bitcoin tends to bounce up from it. Resistance is the ceiling — Bitcoin tends to bounce down from it. We buy near the floor and sell near the ceiling.",
};

const TRIGGER_NAMES: Record<string, string> = {
  ma: '50/200 MA Crossover',
  rsi: 'RSI (Relative Strength)',
  macd: 'MACD Histogram',
  volume: 'Volume Confirmation',
  support: 'Support & Resistance',
};

function StatusDot({ status }: { status: TriggerStatus }) {
  const classes: Record<TriggerStatus, string> = {
    bullish: 'bg-green-400',
    bearish: 'bg-red-400',
    neutral: 'bg-amber-400',
  };
  return <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${classes[status]}`} />;
}

function StatusBadge({ status }: { status: TriggerStatus }) {
  const config: Record<TriggerStatus, { label: string; classes: string }> = {
    bullish: { label: 'BULLISH', classes: 'bg-green-50 text-green-700 border border-green-200' },
    bearish: { label: 'BEARISH', classes: 'bg-red-50 text-red-700 border border-red-200' },
    neutral: { label: 'NEUTRAL', classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  };
  const { label, classes } = config[status];
  return (
    <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  );
}

function TriggerCard({
  id,
  status,
  label,
  value,
}: {
  id: string;
  status: TriggerStatus;
  label: string;
  value: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const borderColor: Record<TriggerStatus, string> = {
    bullish: 'border-green-200',
    bearish: 'border-red-200',
    neutral: 'border-amber-200',
  };
  const bgColor: Record<TriggerStatus, string> = {
    bullish: 'bg-green-50/50',
    bearish: 'bg-red-50/50',
    neutral: 'bg-amber-50/30',
  };

  return (
    <div className={`trigger-card bg-white rounded-xl border ${borderColor[status]} p-4 relative`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={status} />
          <span className="text-sm font-semibold text-gray-800 truncate">{TRIGGER_NAMES[id]}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={status} />
          <button
            onClick={() => setShowTooltip(v => !v)}
            className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="Info"
          >
            i
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xs font-mono font-semibold text-gray-700">{value}</p>
      </div>

      {showTooltip && (
        <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-gray-900 text-white text-xs rounded-xl p-4 shadow-xl leading-relaxed">
          {TRIGGER_TOOLTIPS[id]}
          <button
            onClick={() => setShowTooltip(false)}
            className="block mt-3 text-gray-400 hover:text-white transition-colors"
          >
            Tap to close ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function TriggersPanel({ triggers, signal }: Props) {
  const allBullish = signal === 'BUY';
  const allBearish = signal === 'SELL';

  const panelBorder = allBullish
    ? 'border-green-200 bg-green-50/30'
    : allBearish
    ? 'border-red-200 bg-red-50/30'
    : 'border-gray-100 bg-white';

  const formatMA = () =>
    `MA50 $${triggers.ma.ma50.toLocaleString('en-US', { maximumFractionDigits: 0 })} / MA200 $${triggers.ma.ma200.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const formatRSI = () => `RSI ${triggers.rsi.value.toFixed(1)}`;
  const formatMACD = () =>
    `Hist ${triggers.macd.histogram > 0 ? '+' : ''}${triggers.macd.histogram.toFixed(0)}`;
  const formatVol = () =>
    `${triggers.volume.ratio.toFixed(2)}x avg · ${(triggers.volume.current / 1000).toFixed(0)}K BTC`;
  const formatSR = () =>
    `$${triggers.support.nearestLevel.price.toLocaleString()} (${triggers.support.distancePct > 0 ? '+' : ''}${triggers.support.distancePct.toFixed(1)}%)`;

  const cards = [
    { id: 'ma',      status: triggers.ma.status,      label: triggers.ma.label,      value: formatMA() },
    { id: 'rsi',     status: triggers.rsi.status,     label: triggers.rsi.label,     value: formatRSI() },
    { id: 'macd',    status: triggers.macd.status,    label: triggers.macd.label,    value: formatMACD() },
    { id: 'volume',  status: triggers.volume.status,  label: triggers.volume.label,  value: formatVol() },
    { id: 'support', status: triggers.support.status, label: triggers.support.label, value: formatSR() },
  ];

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-500 ${panelBorder}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Five Triggers</h2>
        {(allBullish || allBearish) && (
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${
              allBullish ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {allBullish ? 'ALL BULLISH — BUY SIGNAL' : 'ALL BEARISH — SELL SIGNAL'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {cards.map(c => (
          <TriggerCard key={c.id} {...c} />
        ))}
      </div>
    </div>
  );
}
