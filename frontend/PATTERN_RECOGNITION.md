# Pattern Recognition System V1

## Overview

A complete professional pattern recognition system for candlestick patterns in the AI Trading Platform V2. This system provides real-time pattern detection, statistical analysis, and comprehensive UI components for traders.

## Features

### ✅ Core Pattern Detection
- **8 Essential Candlestick Patterns**:
  - Doji - Market indecision signal
  - Hammer - Bullish reversal in downtrend
  - Shooting Star - Bearish reversal in uptrend
  - Bullish Engulfing - Powerful bullish reversal
  - Bearish Engulfing - Powerful bearish reversal
  - Bullish Pin Bar - Strong rejection of lower prices
  - Bearish Pin Bar - Strong rejection of higher prices
  - Inside Bar - Consolidation awaiting breakout

### 📊 Advanced Analytics
- Real-time pattern detection (<50ms per candle)
- Confidence scoring system (0-100%)
- Success rate tracking
- Profitability metrics
- Pattern correlation analysis
- Multi-timeframe support (1m, 5m, 15m, 30m, 1h)

### 🎨 Professional UI Components
- **PatternDetector**: Real-time pattern display with live updates
- **PatternDashboard**: Comprehensive analytics and statistics
- **PatternRecognitionExample**: Complete integration example

## Installation

The pattern recognition system is already integrated into the frontend. No additional dependencies required.

## Quick Start

### 1. Import Required Components

```typescript
import { usePatternRecognition } from '@/hooks/usePatternRecognition';
import { PatternDetector } from '@/components/PatternDetector';
import { PatternDashboard } from '@/components/PatternDashboard';
import { CandleData } from '@/types/patterns';
```

### 2. Initialize Pattern Recognition

```typescript
const patternRecognition = usePatternRecognition({
  enableRealTime: true,
  initialSettings: {
    minConfidence: 70,
    timeframes: ['1m', '5m', '15m'],
    enabledPatterns: [
      'DOJI',
      'HAMMER',
      'BULLISH_ENGULFING',
      'BEARISH_ENGULFING',
    ],
  },
});
```

### 3. Detect Patterns from Chart Data

```typescript
useEffect(() => {
  if (chartData.length > 0) {
    const candleData: CandleData[] = chartData.map(point => ({
      time: point.time,
      timestamp: typeof point.time === 'number' 
        ? point.time * 1000 
        : Date.parse(point.time as string),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
    
    patternRecognition.detectPatterns(candleData);
  }
}, [chartData]);
```

### 4. Render UI Components

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <PatternDetector
    patterns={patternRecognition.detectedPatterns}
    isDetecting={patternRecognition.isDetecting}
    onPatternClick={(pattern) => {
      console.log('Pattern clicked:', pattern);
    }}
  />
  
  <PatternDashboard
    patternStats={patternRecognition.patternStats}
    overallPerformance={patternRecognition.overallPerformance}
    onPatternSelect={(patternType) => {
      console.log('Pattern selected:', patternType);
    }}
  />
</div>
```

## API Reference

### usePatternRecognition Hook

```typescript
interface UsePatternRecognitionReturn {
  // Pattern detection
  detectedPatterns: DetectedPattern[];
  detectPatterns: (candles: CandleData[]) => DetectedPattern[];
  clearPatterns: () => void;
  
  // Statistics and analytics
  patternStats: PatternStats[];
  getPatternStats: (patternType: PatternType) => PatternStats;
  overallPerformance: {
    totalPatterns: number;
    successRate: number;
    averageConfidence: number;
    totalProfitability: number;
    bestPattern: PatternType | null;
    worstPattern: PatternType | null;
  };
  
  // Settings management
  settings: DetectionSettings;
  updateSettings: (newSettings: Partial<DetectionSettings>) => void;
  
  // Recent activity
  recentPatterns: DetectedPattern[];
  
  // Loading and error states
  isDetecting: boolean;
  error: string | null;
}
```

### Pattern Detection Algorithms

#### Doji
```typescript
// Criteria: |open - close| <= (high - low) * 0.1
const bodySize = Math.abs(close - open);
const totalRange = high - low;
const bodyRatio = bodySize / totalRange;
isDoji = bodyRatio <= 0.1;
```

#### Hammer
```typescript
// Criteria: (close - low) >= 2 * (high - close) in downtrend
const lowerWick = bodyLow - low;
const upperWick = high - bodyHigh;
const body = Math.abs(close - open);
isHammer = lowerWick >= 2 * upperWick && lowerWick >= 2 * body && trend === 'DOWN';
```

#### Shooting Star
```typescript
// Criteria: (high - open) >= 2 * (close - low) in uptrend
const upperWick = high - bodyHigh;
const lowerWick = bodyLow - low;
const body = Math.abs(close - open);
isShootingStar = upperWick >= 2 * lowerWick && upperWick >= 2 * body && trend === 'UP';
```

#### Bullish Engulfing
```typescript
// Criteria: Current green candle body completely engulfs previous red candle body
const previousBearish = previous.close < previous.open;
const currentBullish = current.close > current.open;
isBullishEngulfing = previousBearish && currentBullish && 
  current.open < previous.close && current.close > previous.open;
```

#### Bearish Engulfing
```typescript
// Criteria: Current red candle body completely engulfs previous green candle body
const previousBullish = previous.close > previous.open;
const currentBearish = current.close < current.open;
isBearishEngulfing = previousBullish && currentBearish && 
  current.open > previous.close && current.close < previous.open;
```

#### Bullish Pin Bar
```typescript
// Criteria: Long lower wick >= 2x body size with bullish bias
const lowerWick = bodyLow - low;
const body = Math.abs(close - open);
isBullishPinBar = lowerWick >= 2 * body && upperWick < body;
```

#### Bearish Pin Bar
```typescript
// Criteria: Long upper wick >= 2x body size with bearish bias
const upperWick = high - bodyHigh;
const body = Math.abs(close - open);
isBearishPinBar = upperWick >= 2 * body && lowerWick < body;
```

#### Inside Bar
```typescript
// Criteria: Current candle range completely within previous candle range
isInsideBar = current.high <= previous.high && current.low >= previous.low;
```

## Architecture

### File Structure
```
frontend/
├── types/
│   └── patterns.ts              # Type definitions
├── lib/
│   └── patterns/
│       ├── detector.ts          # Pattern detection engine
│       └── analyzer.ts          # Statistical analysis service
├── hooks/
│   └── usePatternRecognition.ts # React integration hook
└── components/
    ├── PatternDetector.tsx      # Real-time pattern display
    ├── PatternDashboard.tsx     # Analytics dashboard
    └── PatternRecognitionExample.tsx # Integration example
```

### Components

#### PatternDetector
Real-time pattern detection display with:
- Live pattern updates
- Confidence indicators
- Signal visualization
- Interactive pattern details

#### PatternDashboard
Comprehensive analytics dashboard with:
- Overall performance metrics
- Pattern-specific statistics
- Success rate tracking
- Best/worst pattern identification

### Classes

#### PatternDetector
Mathematical pattern detection engine:
- Real-time candlestick analysis
- Confidence scoring (0-100%)
- Multi-pattern detection
- Performance optimized (<50ms)

#### PatternAnalyzer
Statistical analysis service:
- Pattern performance tracking
- Success rate calculation
- Profitability analysis
- Pattern correlation

## Configuration

### Detection Settings

```typescript
interface DetectionSettings {
  enabledPatterns: PatternType[];    // Patterns to detect
  minConfidence: number;             // Minimum confidence (0-100)
  timeframes: string[];              // Timeframes to analyze
  realTimeUpdates: boolean;          // Enable real-time detection
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH'; // Detection sensitivity
  historicalAnalysis: boolean;       // Enable historical analysis
}
```

### Update Settings

```typescript
patternRecognition.updateSettings({
  minConfidence: 80,
  enabledPatterns: ['DOJI', 'HAMMER', 'BULLISH_ENGULFING'],
  sensitivity: 'HIGH',
});
```

## Performance

- **Detection Speed**: <50ms per candle update
- **Multi-timeframe Support**: 5+ concurrent timeframes
- **Memory Efficient**: Optimized pattern history storage
- **Real-time Processing**: WebSocket-ready integration

## Examples

See `components/PatternRecognitionExample.tsx` for a complete integration example with:
- Pattern detection from chart data
- Real-time UI updates
- Settings management
- Pattern detail display
- Statistics tracking

## Integration with Trading Dashboard

To add pattern recognition to your trading dashboard:

1. Import the example component:
```typescript
import PatternRecognitionExample from '@/components/PatternRecognitionExample';
```

2. Add to your dashboard layout:
```tsx
<div className="mt-4">
  <PatternRecognitionExample
    chartData={chartData}
    timeframe={timeframe}
  />
</div>
```

## Testing

To test the pattern recognition system:

1. Start the development server:
```bash
cd frontend
npm run dev
```

2. Navigate to the trading dashboard
3. The pattern recognition system will automatically detect patterns in the chart data
4. View detected patterns in the PatternDetector component
5. Analyze performance in the PatternDashboard component

## Support

For issues or questions about the pattern recognition system, please refer to:
- Type definitions: `types/patterns.ts`
- Detection algorithms: `lib/patterns/detector.ts`
- Integration example: `components/PatternRecognitionExample.tsx`

## Version

**Version 1.0.0** - Initial implementation with 8 essential candlestick patterns

## License

Part of AI Trading Platform V2
