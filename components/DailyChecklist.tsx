'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

const CHECKLIST_ITEMS = [
  'Check Bitcoin price and overnight move',
  'Check 50-day MA vs 200-day MA — what is the trend?',
  'Check RSI on daily chart — neutral, overbought, or oversold?',
  'Check MACD histogram — accelerating or decelerating?',
  'Check current volume vs 20-day average — high or low?',
  'Identify nearest support and resistance levels',
  'Check news for geopolitical events in next 48 hours',
  'Check economic calendar for Fed/CPI/data releases',
  'Determine if all 5 triggers align — if not, do not trade',
  'If trading, calculate position size based on current rules',
  'Set stop loss and take profit BEFORE entering the trade',
  'Document the trade in journal: entry, reason, stop, target',
];

export default function DailyChecklist() {
  const [checked, setChecked] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));
  const [collapsed, setCollapsed] = useState(true);

  // Reset daily
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const stored = localStorage.getItem('btc_checklist_date');
    if (stored !== today) {
      setChecked(new Array(CHECKLIST_ITEMS.length).fill(false));
      localStorage.setItem('btc_checklist_date', today);
      localStorage.removeItem('btc_checklist');
    } else {
      const raw = localStorage.getItem('btc_checklist');
      if (raw) setChecked(JSON.parse(raw));
    }
  }, []);

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      localStorage.setItem('btc_checklist', JSON.stringify(next));
      return next;
    });
  };

  const count = checked.filter(Boolean).length;
  const allDone = count === CHECKLIST_ITEMS.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
            allDone ? 'bg-green-500 text-white' : 'bg-orange-50 text-orange-600'
          }`}>
            {allDone ? '✓' : count}
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Daily Checklist</p>
            <p className="text-xs text-gray-400">{count}/{CHECKLIST_ITEMS.length} complete</p>
          </div>
        </div>
        <span className="text-gray-400 text-sm">{collapsed ? '▼' : '▲'}</span>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-orange-500'}`}
          style={{ width: `${(count / CHECKLIST_ITEMS.length) * 100}%` }}
        />
      </div>

      {!collapsed && (
        <div className="p-4 pt-3">
          {CHECKLIST_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className="flex items-start gap-3 w-full text-left py-2 group"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                checked[i]
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 group-hover:border-orange-400'
              }`}>
                {checked[i] && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className={`text-sm transition-colors ${
                checked[i] ? 'text-gray-400 line-through' : 'text-gray-700'
              }`}>
                {i + 1}. {item}
              </span>
            </button>
          ))}

          {allDone && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-green-700">✓ All checks complete — ready to trade</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
