'use client';

import { Trade, PositionState, GeopoliticalEvent } from './types';
import { format } from 'date-fns';

const KEYS = {
  TRADES: 'btc_trades',
  POSITION: 'btc_position',
  EVENTS: 'btc_events',
};

// Default upcoming events (April 2026)
const DEFAULT_EVENTS: GeopoliticalEvent[] = [
  {
    id: 'cpi-apr-2026',
    title: 'US CPI Data Release (March 2026)',
    date: new Date('2026-04-10T08:30:00-05:00').getTime(),
    type: 'cpi',
    impact: 'high',
  },
  {
    id: 'fomc-apr-2026',
    title: 'FOMC Meeting — Fed Rate Decision',
    date: new Date('2026-04-29T14:00:00-05:00').getTime(),
    type: 'fed',
    impact: 'high',
  },
  {
    id: 'fomc-may-2026',
    title: 'FOMC Meeting — Fed Rate Decision',
    date: new Date('2026-06-17T14:00:00-05:00').getTime(),
    type: 'fed',
    impact: 'high',
  },
];

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export function getTrades(): Trade[] {
  return safeGet<Trade[]>(KEYS.TRADES, []);
}

export function saveTrade(trade: Trade): void {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === trade.id);
  if (idx >= 0) trades[idx] = trade;
  else trades.unshift(trade);
  safeSet(KEYS.TRADES, trades);
}

export function updateTrade(id: string, updates: Partial<Trade>): void {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === id);
  if (idx >= 0) {
    trades[idx] = { ...trades[idx], ...updates };
    safeSet(KEYS.TRADES, trades);
  }
}

export function deleteTrade(id: string): void {
  const trades = getTrades().filter(t => t.id !== id);
  safeSet(KEYS.TRADES, trades);
}

// ─── Position State ───────────────────────────────────────────────────────────

const DEFAULT_POSITION: PositionState = {
  consecutiveWins: 0,
  consecutiveLosses: 0,
  dailyPnl: 0,
  dailyTrades: 0,
  dailyWins: 0,
  dailyLosses: 0,
  date: format(new Date(), 'yyyy-MM-dd'),
  paused: false,
};

export function getPositionState(): PositionState {
  const stored = safeGet<PositionState>(KEYS.POSITION, DEFAULT_POSITION);
  // Reset daily stats if new day
  const today = format(new Date(), 'yyyy-MM-dd');
  if (stored.date !== today) {
    const reset: PositionState = {
      ...stored,
      dailyPnl: 0,
      dailyTrades: 0,
      dailyWins: 0,
      dailyLosses: 0,
      date: today,
    };
    safeSet(KEYS.POSITION, reset);
    return reset;
  }
  return stored;
}

export function savePositionState(state: PositionState): void {
  safeSet(KEYS.POSITION, state);
}

export function getRecommendedPositionSize(state: PositionState): number {
  if (state.consecutiveLosses >= 2) return 3000;
  if (state.consecutiveWins >= 5) return 10000;
  if (state.consecutiveWins >= 3) return 7500;
  return 5000;
}

export function recordTradeOutcome(won: boolean): PositionState {
  const state = getPositionState();
  const updated: PositionState = {
    ...state,
    dailyTrades: state.dailyTrades + 1,
    dailyWins: won ? state.dailyWins + 1 : state.dailyWins,
    dailyLosses: won ? state.dailyLosses : state.dailyLosses + 1,
    consecutiveWins: won ? state.consecutiveWins + 1 : 0,
    consecutiveLosses: won ? 0 : state.consecutiveLosses + 1,
    paused: !won && state.consecutiveLosses + 1 >= 3,
    pausedUntil: !won && state.consecutiveLosses + 1 >= 3
      ? Date.now() + 48 * 60 * 60 * 1000
      : state.pausedUntil,
  };
  savePositionState(updated);
  return updated;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function getEvents(): GeopoliticalEvent[] {
  const stored = safeGet<GeopoliticalEvent[] | null>(KEYS.EVENTS, null);
  if (stored === null) {
    safeSet(KEYS.EVENTS, DEFAULT_EVENTS);
    return DEFAULT_EVENTS;
  }
  return stored;
}

export function saveEvent(event: GeopoliticalEvent): void {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  safeSet(KEYS.EVENTS, events);
}

export function deleteEvent(id: string): void {
  safeSet(KEYS.EVENTS, getEvents().filter(e => e.id !== id));
}

export function getUpcomingEvents(withinMs = 48 * 60 * 60 * 1000): GeopoliticalEvent[] {
  const now = Date.now();
  return getEvents()
    .filter(e => e.date > now && e.date <= now + withinMs)
    .sort((a, b) => a.date - b.date);
}
