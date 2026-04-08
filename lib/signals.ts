import { Candle, TriggerStatus, SupportResistanceLevel, TriggerData, OverallSignal } from './types';

export function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return 0;
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const emas: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    emas.push(values[i] * k + emas[i - 1] * (1 - k));
  }
  return emas;
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const relevant = closes.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < relevant.length; i++) {
    const change = relevant[i] - relevant[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(closes: number[]): {
  macd: number;
  signal: number;
  histogram: number;
  histogramPrev: number;
} {
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0, histogramPrev: 0 };
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const len = Math.min(ema12.length, ema26.length);
  const macdLine = ema12.slice(-len).map((v, i) => v - ema26[ema26.length - len + i]);
  const signalLine = calculateEMA(macdLine, 9);
  const n = signalLine.length;
  const histogram = macdLine[macdLine.length - 1] - signalLine[n - 1];
  const histogramPrev = macdLine.length >= 2 && n >= 2
    ? macdLine[macdLine.length - 2] - signalLine[n - 2]
    : 0;
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[n - 1],
    histogram,
    histogramPrev,
  };
}

export const SUPPORT_RESISTANCE: SupportResistanceLevel[] = [
  { price: 60750,  label: 'Major Support',       type: 'support' },
  { price: 65000,  label: 'Immediate Support',   type: 'support' },
  { price: 67500,  label: 'Pivot Zone',          type: 'pivot' },
  { price: 70250,  label: 'Immediate Resistance', type: 'resistance' },
  { price: 74950,  label: 'Major Resistance',    type: 'resistance' },
  { price: 85000,  label: 'Breakout Target',     type: 'target' },
];

export function getNearestSRLevel(price: number): {
  nearest: SupportResistanceLevel;
  distancePct: number;
  isNearSupport: boolean;
  isNearResistance: boolean;
} {
  const threshold = 0.025; // 2.5%
  const nearest = SUPPORT_RESISTANCE.reduce((prev, curr) =>
    Math.abs(curr.price - price) < Math.abs(prev.price - price) ? curr : prev
  );
  const distancePct = ((price - nearest.price) / nearest.price) * 100;
  const isNearSupport = SUPPORT_RESISTANCE
    .filter(l => l.type === 'support' || l.type === 'pivot')
    .some(l => Math.abs(price - l.price) / l.price < threshold);
  const isNearResistance = SUPPORT_RESISTANCE
    .filter(l => l.type === 'resistance' || l.type === 'target')
    .some(l => Math.abs(price - l.price) / l.price < threshold);
  return { nearest, distancePct, isNearSupport, isNearResistance };
}

export function buildTriggers(candles: Candle[]): TriggerData {
  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  const price = closes[closes.length - 1];

  // MA
  const ma50 = calculateSMA(closes, 50);
  const ma200 = calculateSMA(closes, 200);
  const maStatus: TriggerStatus = ma50 > ma200 ? 'bullish' : ma50 < ma200 ? 'bearish' : 'neutral';

  // RSI
  const rsi = calculateRSI(closes);
  let rsiStatus: TriggerStatus;
  if (rsi >= 40 && rsi <= 60) rsiStatus = 'bullish';
  else if (rsi > 65 || rsi < 35) rsiStatus = 'bearish';
  else rsiStatus = 'neutral';

  // MACD
  const { macd, signal, histogram, histogramPrev } = calculateMACD(closes);
  let macdStatus: TriggerStatus;
  if (histogram > 0 && histogram > histogramPrev) macdStatus = 'bullish';
  else if (histogram > 0) macdStatus = 'neutral';
  else if (histogram < 0 && histogram < histogramPrev) macdStatus = 'bearish';
  else macdStatus = 'neutral';

  // Volume
  const currentVol = volumes[volumes.length - 1];
  const avg20Vol = calculateSMA(volumes, 20);
  const volRatio = avg20Vol > 0 ? currentVol / avg20Vol : 1;
  let volStatus: TriggerStatus;
  if (volRatio >= 1) volStatus = 'bullish';
  else if (volRatio < 0.8) volStatus = 'bearish';
  else volStatus = 'neutral';

  // Support/Resistance
  const { nearest, distancePct, isNearSupport, isNearResistance } = getNearestSRLevel(price);
  let srStatus: TriggerStatus;
  if (isNearSupport && maStatus === 'bullish') srStatus = 'bullish';
  else if (isNearResistance && maStatus === 'bearish') srStatus = 'bearish';
  else if (isNearSupport || isNearResistance) srStatus = 'neutral';
  else srStatus = 'neutral';

  return {
    ma: {
      status: maStatus,
      ma50,
      ma200,
      label: maStatus === 'bullish' ? 'Golden Cross — Uptrend' : maStatus === 'bearish' ? 'Death Cross — Downtrend' : 'Flat — No Trend',
    },
    rsi: {
      status: rsiStatus,
      value: rsi,
      label: rsi > 65 ? 'Overbought — Exhaustion' : rsi < 35 ? 'Oversold — Bounce Zone' : 'Neutral — Tradeable',
    },
    macd: {
      status: macdStatus,
      histogram,
      histogramPrev,
      macdLine: macd,
      signalLine: signal,
      label: macdStatus === 'bullish' ? 'Momentum Accelerating' : macdStatus === 'bearish' ? 'Momentum Declining' : 'Momentum Flat',
    },
    volume: {
      status: volStatus,
      current: currentVol,
      avg20: avg20Vol,
      ratio: volRatio,
      label: volRatio >= 1.2 ? 'High Volume — Confirmed' : volRatio < 0.8 ? 'Low Volume — Suspect' : 'Average Volume',
    },
    support: {
      status: srStatus,
      nearestLevel: nearest,
      distancePct,
      label: isNearSupport ? `Near ${nearest.label}` : isNearResistance ? `Near ${nearest.label}` : `Between Levels`,
    },
  };
}

export function computeOverallSignal(triggers: TriggerData, price: number): {
  signal: OverallSignal;
  bullishCount: number;
  bearishCount: number;
} {
  const statuses = [
    triggers.ma.status,
    triggers.rsi.status,
    triggers.macd.status,
    triggers.volume.status,
    triggers.support.status,
  ];
  const bullishCount = statuses.filter(s => s === 'bullish').length;
  const bearishCount = statuses.filter(s => s === 'bearish').length;

  // Foundation rule: MA must agree
  const maIsBullish = triggers.ma.status === 'bullish';
  const maIsBearish = triggers.ma.status === 'bearish';

  let signal: OverallSignal = 'WAIT';
  if (maIsBullish && bullishCount >= 4) signal = 'BUY';
  else if (maIsBearish && bearishCount >= 4) signal = 'SELL';

  return { signal, bullishCount, bearishCount };
}

// Compute MA series for charting
export function computeMASeries(candles: Candle[], period: number): { time: number; value: number }[] {
  if (candles.length < period) return [];
  return candles.slice(period - 1).map((c, i) => ({
    time: c.time,
    value: calculateSMA(candles.slice(i, i + period).map(x => x.close), period),
  }));
}
