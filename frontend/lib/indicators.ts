// indicators.ts - Calcolo indicatori tecnici

/**
 * Calcola Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  if (data.length === 0 || period <= 0) {
    return [];
  }

  const ema: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  // Prima EMA = SMA
  let sma = 0;
  for (let i = 0; i < period; i++) {
    if (i >= data.length) {
      ema. push(null);
      continue;
    }
    sma += data[i];
    ema.push(null);
  }

  if (data.length < period) {
    return ema;
  }

  sma = sma / period;
  ema[period - 1] = sma;

  // Calcola EMA
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] - ema[i - 1]!) * multiplier + ema[i - 1]!;
    ema.push(currentEMA);
  }

  return ema;
}

/**
 * Calcola multiple EMA
 */
export function calculateMultipleEMA(
  data: number[],
  periods: number[]
): Record<number, (number | null)[]> {
  const result: Record<number, (number | null)[]> = {};
  for (const period of periods) {
    result[period] = calculateEMA(data, period);
  }
  return result;
}

/**
 * Calculate EMA trend direction
 */
export function calculateEMATrend(
  chartData: { close: number }[], 
  period: number
): 'bullish' | 'bearish' | 'neutral' {
  const closes = chartData.map(c => c.close);
  const ema = calculateEMA(closes, period);
  
  if (ema.length < 2) return 'neutral';
  
  // Get last two non-null values
  const nonNullValues = ema.filter(v => v !== null) as number[];
  if (nonNullValues.length < 2) return 'neutral';
  
  const current = nonNullValues[nonNullValues.length - 1];
  const previous = nonNullValues[nonNullValues.length - 2];
  
  if (current > previous) return 'bullish';
  if (current < previous) return 'bearish';
  return 'neutral';
}
