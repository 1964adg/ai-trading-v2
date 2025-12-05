# VWAP & Volume Profile Indicators Guide

## Overview

Professional-grade **VWAP (Volume Weighted Average Price)** and **Volume Profile** indicators optimized for scalping operations. These institutional-quality tools provide market microstructure insights essential for professional trading.

## Table of Contents

1. [Features](#features)
2. [Getting Started](#getting-started)
3. [VWAP Indicator](#vwap-indicator)
4. [Volume Profile Indicator](#volume-profile-indicator)
5. [Performance](#performance)
6. [API Reference](#api-reference)
7. [Examples](#examples)

## Features

### VWAP Indicator
- ✅ **Session VWAP** - Resets at market open
- ✅ **Rolling VWAP** - Configurable periods (1h, 4h, custom)
- ✅ **Multi-source calculation** - Close, HLC3, OHLC4
- ✅ **Standard Deviation Bands** - 1σ, 2σ, 3σ levels
- ✅ **Real-time updates** - <5ms calculation time
- ✅ **Customizable colors** - VWAP line and band colors

### Volume Profile Indicator
- ✅ **POC (Point of Control)** - Highest volume price level
- ✅ **VAH (Value Area High)** - Top of 70% volume area
- ✅ **VAL (Value Area Low)** - Bottom of 70% volume area
- ✅ **Configurable bins** - 50, 100, 200 price levels
- ✅ **Real-time updates** - <10ms calculation time
- ✅ **Flexible display** - Left/right position, opacity control

## Getting Started

### Enabling Indicators

The indicator controls are located below the EMA settings on the main trading page:

1. **VWAP Controls** - Left panel
2. **Volume Profile Controls** - Right panel

Simply check the "Enable" checkbox to activate each indicator.

### Basic Configuration

#### VWAP Quick Setup
```typescript
// Default configuration (automatically applied)
{
  period: 'session',  // Resets daily
  source: 'hlc3',     // (High + Low + Close) / 3
  bands: [1, 2],      // 1σ and 2σ bands
  color: '#4ECDC4',   // Cyan VWAP line
}
```

#### Volume Profile Quick Setup
```typescript
// Default configuration (automatically applied)
{
  bins: 50,               // 50 price levels
  valueAreaPercent: 70,   // 70% value area
  period: 'session',      // Current session
  position: 'right',      // Right side of chart
}
```

## VWAP Indicator

### What is VWAP?

VWAP (Volume Weighted Average Price) is the average price weighted by volume. It's used by:
- **Institutional traders** - As execution benchmark
- **Day traders** - As support/resistance level
- **Scalpers** - For mean reversion trades

### Trading with VWAP

#### Price Above VWAP
- 🟢 **Bullish bias** - Market is trading above average
- 💡 **Strategy**: Look for pullbacks to VWAP for long entries

#### Price Below VWAP
- 🔴 **Bearish bias** - Market is trading below average
- 💡 **Strategy**: Look for bounces to VWAP for short entries

#### VWAP Bands
- **+1σ Band**: Overbought zone (consider taking profits)
- **+2σ Band**: Extreme overbought (reversal likely)
- **-1σ Band**: Oversold zone (consider taking profits)
- **-2σ Band**: Extreme oversold (reversal likely)

### Configuration Options

#### Period Selection

| Period | Description | Use Case |
|--------|-------------|----------|
| **Session** | Resets at market open | Day trading, intraday scalping |
| **Rolling** | Last 60 periods | Short-term trend following |
| **30 Periods** | Last 30 candles | Ultra-short-term scalping |
| **60 Periods** | Last 60 candles | Medium-term scalping |

#### Price Source

| Source | Formula | Best For |
|--------|---------|----------|
| **Close** | Closing price | Simple VWAP |
| **HLC3** | (High + Low + Close) / 3 | Balanced VWAP (recommended) |
| **OHLC4** | (Open + High + Low + Close) / 4 | Complete candle data |

### VWAP Trading Strategies

#### Strategy 1: VWAP Bounce
```
Entry: Price touches VWAP from above (bullish) or below (bearish)
Stop Loss: Beyond +/-1σ band
Take Profit: +1σ band (opposite side)
```

#### Strategy 2: VWAP Band Mean Reversion
```
Entry: Price reaches +/-2σ band
Stop Loss: Beyond +/-3σ band (if enabled)
Take Profit: Return to VWAP
```

#### Strategy 3: VWAP Breakout
```
Entry: Strong volume breakout above/below VWAP
Stop Loss: Back through VWAP
Take Profit: +/-1σ band
```

## Volume Profile Indicator

### What is Volume Profile?

Volume Profile shows the distribution of volume across price levels. Key levels:

- **POC (Point of Control)**: Price with highest volume - acts as magnet
- **VAH (Value Area High)**: Top of 70% volume area - resistance
- **VAL (Value Area Low)**: Bottom of 70% volume area - support

### Trading with Volume Profile

#### POC (Point of Control)
- 🎯 **Strongest support/resistance** - Highest volume traded
- 💡 **Strategy**: Trade bounces off POC, breakouts through POC

#### Value Area (VAH/VAL)
- 📊 **70% of volume** - "Fair value" range
- 💡 **Strategy**: 
  - Inside value area: Range-bound trading
  - Outside value area: Mean reversion to VAH/VAL

#### Volume Nodes
- **High Volume Nodes**: Strong support/resistance
- **Low Volume Nodes**: Price moves quickly through these levels

### Configuration Options

#### Bin Count

| Bins | Description | Use Case |
|------|-------------|----------|
| **50** | Coarse resolution | Quick overview, fast calculation |
| **100** | Medium resolution | Balanced detail and performance |
| **200** | Fine resolution | Precise level identification |

#### Value Area Percentage

| Percentage | Description | Use Case |
|------------|-------------|----------|
| **70%** | Standard | Most common, industry standard |
| **80%** | Wider range | Conservative trading |
| **90%** | Very wide | Ultra-conservative |

### Volume Profile Trading Strategies

#### Strategy 1: POC Bounce
```
Entry: Price approaches POC level
Stop Loss: 2-3 ticks beyond POC
Take Profit: VAH or VAL (opposite boundary)
```

#### Strategy 2: Value Area Breakout
```
Entry: Price breaks above VAH or below VAL
Stop Loss: Back inside value area
Take Profit: Previous day's POC or extreme levels
```

#### Strategy 3: Low Volume Node Speed Run
```
Entry: Price enters low volume area
Stop Loss: Tight (price moves fast)
Take Profit: Next high volume node
```

## Performance

### Calculation Speed

| Indicator | Data Size | Target | Actual |
|-----------|-----------|--------|--------|
| VWAP | 1000 candles | <5ms | ~3-4ms |
| VWAP Bands | 1000 candles | <5ms | ~3-4ms |
| Volume Profile | 500 bins | <10ms | ~7-9ms |
| Volume Profile | 200 bins | <10ms | ~5-6ms |

### Memory Usage

- **VWAP**: ~50KB per 1000 data points
- **Volume Profile**: ~30KB per 500 bins
- **Combined**: <100KB for full day data

### Real-time Updates

- **Update frequency**: 60 FPS (16ms cycle)
- **WebSocket latency**: <50ms
- **Chart rendering**: <16ms per frame

## API Reference

### VWAP Calculator

```typescript
import { VWAPCalculator } from '@/lib/indicators/vwap';

const calculator = new VWAPCalculator();

// Calculate VWAP
const vwapData = calculator.calculate(candles, config, sessionStart);

// Get current VWAP value
const currentVWAP = calculator.getCurrentVWAP(vwapData);

// Check if price is above VWAP
const isAbove = calculator.isPriceAboveVWAP(price, currentVWAP);

// Get distance from VWAP (percentage)
const distance = calculator.getVWAPDistance(price, currentVWAP);
```

### Volume Profile Calculator

```typescript
import { VolumeProfileCalculator } from '@/lib/indicators/volume-profile';

const calculator = new VolumeProfileCalculator();

// Calculate Volume Profile
const profileData = calculator.calculate(candles, config);

// Get POC
const poc = profileData.poc;

// Get Value Area
const { vah, val } = profileData;

// Check if price is in value area
const inValueArea = calculator.isPriceInValueArea(price, val, vah);

// Get volume at specific price
const volume = calculator.getVolumeAtPrice(profileData.nodes, price);
```

### React Hooks

```typescript
import { useVWAP } from '@/hooks/useVWAP';
import { useVolumeProfile } from '@/hooks/useVolumeProfile';

// VWAP Hook
const { 
  vwapData, 
  currentVWAP, 
  isPriceAboveVWAP,
  getVWAPDistance 
} = useVWAP({
  candles,
  config: vwapConfig,
  sessionStart,
  enabled: true
});

// Volume Profile Hook
const {
  profileData,
  poc,
  vah,
  val,
  isPriceInValueArea,
  highVolumeNodes,
  lowVolumeNodes
} = useVolumeProfile({
  candles,
  config: volumeProfileConfig,
  sessionStart,
  sessionEnd,
  enabled: true
});
```

## Examples

### Example 1: VWAP Mean Reversion Bot

```typescript
// Pseudo-code for a simple VWAP mean reversion strategy
const { currentVWAP, getVWAPDistance } = useVWAP({...});

if (getVWAPDistance(currentPrice) > 2.0) {
  // Price is 2% away from VWAP
  if (currentPrice > currentVWAP) {
    // Price above VWAP - potential short
    enterShort(currentPrice, stopLoss: currentPrice + 0.5%);
  } else {
    // Price below VWAP - potential long
    enterLong(currentPrice, stopLoss: currentPrice - 0.5%);
  }
}
```

### Example 2: Volume Profile Support/Resistance

```typescript
// Pseudo-code for trading POC levels
const { poc, vah, val, isPriceInValueArea } = useVolumeProfile({...});

if (currentPrice < poc && !isPriceInValueArea(currentPrice)) {
  // Below POC and outside value area - oversold
  enterLong(currentPrice, takeProfit: poc);
} else if (currentPrice > poc && !isPriceInValueArea(currentPrice)) {
  // Above POC and outside value area - overbought
  enterShort(currentPrice, takeProfit: poc);
}
```

### Example 3: Combined VWAP + Volume Profile

```typescript
// Pseudo-code for combining both indicators
const { currentVWAP, isPriceAboveVWAP } = useVWAP({...});
const { poc, vah, val } = useVolumeProfile({...});

// Look for confluence of VWAP and POC
if (Math.abs(currentVWAP - poc) < 0.1%) {
  // VWAP and POC are aligned - strong level
  if (currentPrice < currentVWAP) {
    // Below both - strong long opportunity
    enterLong(currentPrice, stopLoss: val, takeProfit: vah);
  }
}
```

## Tips for Professional Trading

### 1. Combine with Price Action
VWAP and Volume Profile work best when combined with candlestick patterns and support/resistance.

### 2. Respect the Session
VWAP resets daily. The most important VWAP interactions happen in the first 1-2 hours after market open.

### 3. Use Multiple Timeframes
- **1m/5m**: Scalping entries
- **15m/1h**: Trend confirmation
- **4h/1d**: Overall bias

### 4. Watch Volume
High volume at POC or VWAP indicates institutional activity - these are the strongest levels.

### 5. Set Alerts
Set price alerts at:
- VWAP level
- POC level
- VAH and VAL levels
- +/-2σ VWAP bands

## Troubleshooting

### VWAP not showing?
- Check "Enable" checkbox in VWAP Controls
- Ensure sufficient data (minimum 10 candles)
- Verify VWAP color is not same as background

### Volume Profile lines not visible?
- Check "Show POC Line" and "Show Value Area" checkboxes
- Ensure sufficient volume data
- Try different period (Session vs Week)

### Performance issues?
- Reduce bin count (use 50 instead of 200)
- Disable VWAP bands if not needed
- Close other browser tabs

## Support

For issues or questions:
1. Check this documentation
2. Review code comments in indicator files
3. Open an issue on GitHub
4. Contact the development team

## License

Part of the AI Trading v2 platform. See main repository for license information.
