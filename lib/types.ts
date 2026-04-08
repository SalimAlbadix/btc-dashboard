export interface Candle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TriggerStatus = 'bullish' | 'bearish' | 'neutral';
export type OverallSignal = 'BUY' | 'SELL' | 'WAIT';

export interface TriggerData {
  ma: {
    status: TriggerStatus;
    ma50: number;
    ma200: number;
    label: string;
  };
  rsi: {
    status: TriggerStatus;
    value: number;
    label: string;
  };
  macd: {
    status: TriggerStatus;
    histogram: number;
    histogramPrev: number;
    macdLine: number;
    signalLine: number;
    label: string;
  };
  volume: {
    status: TriggerStatus;
    current: number;
    avg20: number;
    ratio: number;
    label: string;
  };
  support: {
    status: TriggerStatus;
    nearestLevel: SupportResistanceLevel;
    distancePct: number;
    label: string;
  };
}

export interface SupportResistanceLevel {
  price: number;
  label: string;
  type: 'support' | 'resistance' | 'pivot' | 'target';
}

export interface SignalData {
  price: number;
  priceChangeDollar: number;
  priceChangePercent: number;
  triggers: TriggerData;
  overallSignal: OverallSignal;
  supportResistance: SupportResistanceLevel[];
  candles: Candle[];
  lastUpdated: number;
  bullishCount: number;
  bearishCount: number;
}

export interface PriceData {
  price: number;
  priceChangeDollar: number;
  priceChangePercent: number;
  volume24h: number;
  lastUpdated: number;
}

export type TradeStatus = 'open' | 'closed' | 'stopped' | 'expired';

export interface Trade {
  id: string;
  timestamp: number;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  takeProfit2: number;
  pnl?: number;
  pnlPct?: number;
  status: TradeStatus;
  triggersActive: string[];
  notes?: string;
}

export interface PositionState {
  consecutiveWins: number;
  consecutiveLosses: number;
  dailyPnl: number;
  dailyTrades: number;
  dailyWins: number;
  dailyLosses: number;
  date: string; // 'YYYY-MM-DD'
  paused: boolean;
  pausedUntil?: number;
}

export interface GeopoliticalEvent {
  id: string;
  title: string;
  date: number; // Unix ms timestamp
  type: 'fed' | 'cpi' | 'political' | 'etf' | 'other';
  impact: 'high' | 'medium';
}

export interface BacktestTrade {
  date: string;
  type: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  pnl: number;
  pnlPct: number;
  outcome: 'win' | 'loss' | 'expired';
  daysHeld: number;
}

export interface BacktestResult {
  totalTrades: number;
  buySignals: number;
  sellSignals: number;
  wins: number;
  losses: number;
  expired: number;
  winRate: number;
  avgWinPct: number;
  avgLossPct: number;
  riskReward: number;
  maxDrawdown: number;
  totalReturnPct: number;
  trades: BacktestTrade[];
  startCapital: number;
  endCapital: number;
}
