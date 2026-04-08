'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Candle, SupportResistanceLevel } from '@/lib/types';

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

interface Props {
  ma50: number;
  ma200: number;
  supportResistance: SupportResistanceLevel[];
  initialCandles: Candle[];
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y'];

function formatPrice(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function PriceChart({ ma50, ma200, supportResistance, initialCandles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tf, setTf] = useState<Timeframe>('3M');
  const [candles, setCandles] = useState<Candle[]>(initialCandles);
  const [loading, setLoading] = useState(false);
  // Store chart instance for cleanup
  const chartRef = useRef<{ remove: () => void } | null>(null);

  const fetchCandles = useCallback(async (timeframe: Timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/candles?tf=${timeframe}`);
      if (res.ok) {
        const data = await res.json();
        setCandles(data.candles);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTfChange = (newTf: Timeframe) => {
    setTf(newTf);
    fetchCandles(newTf);
  };

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    let cancelled = false;

    (async () => {
      const lc = await import('lightweight-charts');
      if (cancelled || !containerRef.current) return;

      const {
        createChart,
        ColorType,
        LineStyle,
        CrosshairMode,
        CandlestickSeries,
        HistogramSeries,
        LineSeries,
      } = lc;

      // Helper to cast unix seconds → UTCTimestamp (branded number)
      type UT = import('lightweight-charts').UTCTimestamp;
      const ut = (t: number) => t as UT;

      // Remove previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 380,
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#6B7280',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#F3F4F6' },
          horzLines: { color: '#F3F4F6' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: '#E5E7EB',
          scaleMargins: { top: 0.05, bottom: 0.25 },
        },
        timeScale: {
          borderColor: '#E5E7EB',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScale: { mouseWheel: true, pinch: true },
        handleScroll: { vertTouchDrag: false },
      });

      chartRef.current = chart;

      // Candlestick series (v5 API)
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderUpColor: '#10B981',
        borderDownColor: '#EF4444',
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });

      const validCandles = candles.filter(
        c => c.time > 0 && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
      );

      candleSeries.setData(
        validCandles.map(c => ({
          time: ut(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      // Volume series
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' as const },
        priceScaleId: 'vol',
        color: '#E5E7EB',
      });
      chart.priceScale('vol').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(
        validCandles.map(c => ({
          time: ut(c.time),
          value: c.volume,
          color: c.close >= c.open ? '#10B98140' : '#EF444440',
        }))
      );

      // MA lines
      const isDailyChart = ['1M', '3M', '1Y'].includes(tf);

      if (isDailyChart && validCandles.length >= 50) {
        const closes = validCandles.map(c => c.close);

        const ma50Series = chart.addSeries(LineSeries, {
          color: '#3B82F6',
          lineWidth: 2,
          title: 'MA50',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const ma50Data = [];
        for (let i = 49; i < validCandles.length; i++) {
          const avg = closes.slice(i - 49, i + 1).reduce((a, b) => a + b, 0) / 50;
          ma50Data.push({ time: ut(validCandles[i].time), value: avg });
        }
        ma50Series.setData(ma50Data);

        if (validCandles.length >= 200) {
          const ma200Series = chart.addSeries(LineSeries, {
            color: '#FF7832',
            lineWidth: 2,
            title: 'MA200',
            priceLineVisible: false,
            lastValueVisible: false,
          });
          const ma200Data = [];
          for (let i = 199; i < validCandles.length; i++) {
            const avg = closes.slice(i - 199, i + 1).reduce((a, b) => a + b, 0) / 200;
            ma200Data.push({ time: ut(validCandles[i].time), value: avg });
          }
          ma200Series.setData(ma200Data);
        }
      } else {
        // Current MA as horizontal price lines
        if (ma50 > 0) {
          candleSeries.createPriceLine({
            price: ma50,
            color: '#3B82F6',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `MA50 ${formatPrice(ma50)}`,
          });
        }
        if (ma200 > 0) {
          candleSeries.createPriceLine({
            price: ma200,
            color: '#FF7832',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `MA200 ${formatPrice(ma200)}`,
          });
        }
      }

      // Support / Resistance lines
      supportResistance.forEach(level => {
        const color =
          level.type === 'support'    ? '#10B981' :
          level.type === 'resistance' ? '#EF4444' :
          level.type === 'target'     ? '#8B5CF6' : '#F59E0B';
        candleSeries.createPriceLine({
          price: level.price,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: level.label,
        });
      });

      chart.timeScale().fitContent();

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          (chartRef.current as typeof chart).applyOptions({
            width: containerRef.current.clientWidth,
          });
        }
      });
      if (containerRef.current) ro.observe(containerRef.current);
    })();

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, ma50, ma200, supportResistance, tf]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Price Chart</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-3 h-0.5 bg-blue-500 rounded" /> MA50
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-3 h-0.5 bg-orange-500 rounded" /> MA200
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-3 h-0.5 bg-green-500 rounded" /> Support
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-3 h-0.5 bg-red-500 rounded" /> Resistance
            </span>
          </div>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => handleTfChange(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tf === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
            <div className="text-sm text-gray-400">Loading chart...</div>
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
