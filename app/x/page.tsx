'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { SignalData, Trade, PositionState } from '@/lib/types';
import { getTrades, getPositionState } from '@/lib/storage';

// Dynamic imports for client-only components
const HeroBar = dynamic(() => import('@/components/HeroBar'), { ssr: false });
const TriggersPanel = dynamic(() => import('@/components/TriggersPanel'), { ssr: false });
const PriceChart = dynamic(() => import('@/components/PriceChart'), { ssr: false });
const ActionButtons = dynamic(() => import('@/components/ActionButtons'), { ssr: false });
const PositionSizeCard = dynamic(() => import('@/components/PositionSizeCard'), { ssr: false });
const DailyPnL = dynamic(() => import('@/components/DailyPnL'), { ssr: false });
const GeopoliticalBanner = dynamic(() => import('@/components/GeopoliticalBanner'), { ssr: false });
const TradeJournal = dynamic(() => import('@/components/TradeJournal'), { ssr: false });
const BacktestModule = dynamic(() => import('@/components/BacktestModule'), { ssr: false });
const DailyChecklist = dynamic(() => import('@/components/DailyChecklist'), { ssr: false });

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 animate-pulse rounded-2xl ${className}`} />;
}

export default function DashboardPage() {
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positionState, setPositionState] = useState<PositionState | null>(null);
  const [signalChangeTime, setSignalChangeTime] = useState(Date.now());
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTrades(getTrades());
    setPositionState(getPositionState());
  }, []);

  const refreshLocalState = useCallback(() => {
    setTrades(getTrades());
    setPositionState(getPositionState());
  }, []);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals');
      if (!res.ok) throw new Error('API error');
      const data: SignalData = await res.json();
      setSignalData(prev => {
        if (prev?.overallSignal !== data.overallSignal) {
          setSignalChangeTime(Date.now());
        }
        return data;
      });
      setLastSignal(data.overallSignal);
      setError(null);
    } catch {
      setError('Unable to fetch live data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const id = setInterval(fetchSignals, 60000);
    return () => clearInterval(id);
  }, [fetchSignals]);

  const openTrades = trades.filter(t => t.status === 'open');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">₿</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">BTC Trading System</span>
          </div>
          <div className="flex items-center gap-2">
            {signalData && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Live
              </div>
            )}
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-500">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                Offline
              </div>
            )}
            <button
              onClick={fetchSignals}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-24">

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Geopolitical banner — client only */}
        {mounted && (
          <GeopoliticalBanner />
        )}

        {/* Hero */}
        {loading ? (
          <Skeleton className="h-40" />
        ) : signalData ? (
          <HeroBar
            signal={signalData.overallSignal}
            lastSignalChange={signalChangeTime}
            bullishCount={signalData.bullishCount}
            bearishCount={signalData.bearishCount}
          />
        ) : null}

        {/* Action buttons */}
        {mounted && signalData && (
          <ActionButtons
            signal={signalData.overallSignal}
            price={signalData.price}
            onTradeLogged={refreshLocalState}
          />
        )}

        {/* Five Triggers */}
        {loading ? (
          <Skeleton className="h-96" />
        ) : signalData ? (
          <TriggersPanel
            triggers={signalData.triggers}
            signal={signalData.overallSignal}
          />
        ) : null}

        {/* Price Chart */}
        {loading ? (
          <Skeleton className="h-96" />
        ) : signalData ? (
          <PriceChart
            ma20={signalData.triggers.ma.ma20}
            ma50={signalData.triggers.ma.ma50}
            ma200={signalData.triggers.ma.ma200}
            supportResistance={signalData.supportResistance}
            initialCandles={signalData.candles}
          />
        ) : null}

        {/* Two-column row: Position Size + Daily P&L */}
        {mounted && positionState && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PositionSizeCard
              state={positionState}
              openTrades={openTrades}
            />
            <DailyPnL
              state={positionState}
              trades={trades}
            />
          </div>
        )}

        {/* Daily Checklist */}
        {mounted && <DailyChecklist />}

        {/* Trade Journal */}
        {mounted && (
          <TradeJournal
            trades={trades}
            onUpdate={refreshLocalState}
          />
        )}

        {/* Backtesting */}
        <BacktestModule />

        {/* Disclaimer */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-700 mb-1">⚠️ Disclaimer</p>
          <p className="text-xs text-red-600 leading-relaxed">
            This system is designed for disciplined daily trading with a realistic edge — expect 30–60% annual returns
            if executed perfectly, not 400%. Start small. Backtest first. Paper trade second.
            Never risk capital you cannot afford to lose. This is not financial advice.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-300">Built for Salim · April 2026</p>
        </div>
      </main>
    </div>
  );
}
