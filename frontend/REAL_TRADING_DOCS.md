# Real Trading Integration - Documentation

## Overview

The Real Trading Integration transforms the AI Trading v2 platform from a simulator into a professional-grade real trading platform with support for Paper Trading, Binance Testnet, and Live Trading modes.

## Trading Modes

### 📝 Paper Mode (Default)
- **Description**: Complete local simulation with fake money
- **Starting Balance**: $10,000 USDT (virtual)
- **Risk Level**: SAFE - Zero financial risk
- **Use Case**: Testing strategies, learning platform features
- **Requirements**: None - works out of the box

### 🧪 Testnet Mode
- **Description**: Binance Testnet API integration
- **Starting Balance**: Virtual $100,000 USDT from Binance Testnet
- **Risk Level**: LOW - Uses test network with virtual funds
- **Use Case**: Advanced testing with real API behavior
- **Requirements**: Binance Testnet API credentials

### 💰 Real Mode
- **Description**: Live Binance API integration
- **Risk Level**: HIGH - Uses real money
- **Use Case**: Production trading with real funds
- **Requirements**: Binance API credentials with trading permissions

## Risk Management

### Default Risk Limits

All trading operations are automatically validated against these limits:

```typescript
{
  maxDailyLoss: 500,          // $500 maximum daily loss
  maxPositionSize: 0.10,      // 10% of balance per position
  maxOrderValue: 10000,       // $10,000 maximum single order
  maxOpenPositions: 5,        // 5 simultaneous positions
  maxDailyTrades: 100         // 100 trades per day
}
```

### Risk Validation

Every order is validated before execution:
- Daily loss limit check
- Position size limit check
- Order value limit check
- Open positions count check
- Daily trades count check

Orders that violate risk limits are automatically rejected with clear explanations.

## UI Components

### TradingModeSelector
Located in the dashboard header, allows switching between Paper/Testnet/Real modes.

**Features:**
- Visual mode indicators with icons
- Safety confirmations for Real mode
- Credential validation
- Mode history tracking

### RealBalancePanel
Displays current account balance and P&L tracking.

**Features:**
- Total, available, and locked balance
- Daily P&L with percentage
- Total P&L tracking
- Risk level indicator
- Mode-specific warnings

### RealPositionsPanel
Shows active trading positions (visible in Testnet/Real modes).

**Features:**
- Position details (entry, mark price, quantity)
- Unrealized P&L per position
- Total portfolio P&L
- Quick actions (modify, close, trailing stop)
- Emergency stop controls

### RiskControlsPanel
Configure and monitor risk management settings.

**Features:**
- Editable risk limits
- Real-time risk utilization display
- Daily activity summary
- Remaining loss buffer tracking

## API Integration

### Real Trading API Client

The `RealTradingAPIClient` class handles all API interactions:

```typescript
import { realTradingAPI } from '@/lib/real-trading-api';

// Set trading mode
realTradingAPI.setMode('paper'); // or 'testnet' or 'real'

// Set credentials (for testnet/real)
realTradingAPI.setCredentials({
  apiKey: 'your-api-key',
  secretKey: 'your-secret-key',
});

// Get account info
const balances = await realTradingAPI.getAccountInfo();

// Place order
const order = await realTradingAPI.placeOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: 0.001,
});

// Get positions
const positions = await realTradingAPI.getPositions();
```

### Rate Limiting

The API client includes automatic rate limiting:
- **Limit**: 1200 requests per minute
- **Window**: Rolling 60-second window
- **Behavior**: Automatic wait when limit approached

## React Hooks

### useRealTrading

Main hook for real trading functionality:

```typescript
import { useRealTrading } from '@/hooks/useRealTrading';

function MyComponent() {
  const { 
    currentMode,
    placeOrder,
    fetchBalance,
    fetchPositions 
  } = useRealTrading({
    enabled: true,
    refreshInterval: 5000, // 5 seconds
  });

  // Use the hook...
}
```

**Features:**
- Auto-refresh balance and positions
- Place and cancel orders
- Set API credentials
- Mode-aware operations

### useRiskManager

Hook for risk management:

```typescript
import { useRiskManager } from '@/hooks/useRiskManager';

function MyComponent() {
  const {
    validateOrder,
    canTrade,
    calculateRecommendedSize,
    getRiskSummary,
  } = useRiskManager();

  // Validate order before placing
  const validation = validateOrder(order, currentPrice);
  if (!validation.passed) {
    alert(validation.reason);
    return;
  }

  // Check if trading is allowed
  if (!canTrade().passed) {
    alert('Trading disabled due to risk limits');
    return;
  }
}
```

## State Management

### Zustand Stores

Three new stores manage real trading state:

#### tradingModeStore
```typescript
import { useTradingModeStore } from '@/stores/tradingModeStore';

const { currentMode, setMode, getModeInfo } = useTradingModeStore();
```

#### realBalanceStore
```typescript
import { useRealBalanceStore } from '@/stores/realBalanceStore';

const { 
  totalBalance, 
  dailyPnL, 
  setBalances 
} = useRealBalanceStore();
```

#### realPositionsStore
```typescript
import { useRealPositionsStore } from '@/stores/realPositionsStore';

const { 
  positions, 
  totalUnrealizedPnL, 
  setPositions 
} = useRealPositionsStore();
```

## Safety Features

### Confirmation Dialogs

All dangerous operations require confirmation:

1. **Real Mode Switch**: Confirms before enabling real trading
2. **Real Order Execution**: Confirms each real trade
3. **Emergency Stop**: Confirms before closing all positions
4. **Risk Limit Override**: Warns when exceeding safe limits

### Emergency Controls

- **Emergency Stop**: Immediately close all positions
- **Close All**: Close all positions safely
- **Mode Switch**: Quick return to Paper mode

### API Security

- **Credentials Encryption**: API keys encrypted in memory
- **HMAC Signatures**: Secure API request signing
- **Never Logged**: Credentials never appear in logs
- **Request Sanitization**: Sensitive data removed from logs

## Configuration

### Environment Variables

For production deployment:

```env
# Binance API Configuration
NEXT_PUBLIC_BINANCE_API_URL=https://api.binance.com
NEXT_PUBLIC_BINANCE_TESTNET_URL=https://testnet.binance.vision

# Default Risk Limits
NEXT_PUBLIC_MAX_DAILY_LOSS=500
NEXT_PUBLIC_MAX_POSITION_SIZE=0.10
NEXT_PUBLIC_MAX_ORDER_VALUE=10000
```

### Customizing Risk Limits

Risk limits can be customized through the Risk Controls Panel UI or programmatically:

```typescript
import { riskManager } from '@/lib/risk-manager';

riskManager.setRiskLimits({
  maxDailyLoss: 1000,
  maxPositionSize: 0.15,
  maxOrderValue: 20000,
});
```

## Testing

### Manual Testing Checklist

#### Paper Mode
- [ ] Switch to Paper mode
- [ ] Verify balance shows $10,000
- [ ] Place test orders
- [ ] Check risk validation
- [ ] Verify no real API calls

#### Testnet Mode (requires credentials)
- [ ] Add Testnet API credentials
- [ ] Switch to Testnet mode
- [ ] Fetch real balance from Testnet
- [ ] Place test order on Testnet
- [ ] Verify order appears in Testnet account

#### Real Mode (requires credentials + caution)
- [ ] Add Real API credentials
- [ ] Attempt to switch to Real mode
- [ ] Verify confirmation dialog appears
- [ ] Test with minimal amounts first
- [ ] Verify risk limits enforced

### Automated Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build production bundle
npm run build
```

## Troubleshooting

### Common Issues

#### "API credentials required"
**Solution**: Add API credentials through the UI or programmatically before switching to Testnet/Real mode.

#### "Failed to fetch balance"
**Solution**: 
1. Check API credentials are correct
2. Verify API keys have required permissions
3. Check network connectivity
4. Verify Binance API is accessible

#### "Risk limit exceeded"
**Solution**: Order violates risk limits. Either:
1. Reduce order size
2. Adjust risk limits (not recommended for beginners)
3. Wait for daily reset (00:00 UTC)

#### Rate limiting errors
**Solution**: The client automatically handles rate limiting. If you see errors:
1. Reduce refresh frequency
2. Wait for rate limit window to reset
3. Check for multiple instances running

## Best Practices

### For Paper Trading
1. Start in Paper mode to learn the platform
2. Test all features thoroughly
3. Develop and backtest strategies
4. Practice risk management

### For Testnet Trading
1. Validate strategies with real API
2. Test order execution
3. Practice emergency procedures
4. Verify WebSocket connections

### For Real Trading
1. **Start small** - Use minimal position sizes
2. **Test first** - Always test in Paper/Testnet first
3. **Set limits** - Configure conservative risk limits
4. **Monitor closely** - Watch positions actively
5. **Emergency plan** - Know how to use emergency stop
6. **Gradual increase** - Increase position sizes slowly

## Architecture

### Component Hierarchy

```
Dashboard (app/page.tsx)
├── TradingModeSelector
├── RealBalancePanel
├── QuickAccessPanel (existing)
├── TradingChart (existing)
├── LiveOrderbook (existing)
├── QuickTradePanel (existing)
├── RealPositionsPanel (new, conditional)
├── RiskControlsPanel (new, conditional)
├── MultiPositionManager (existing)
└── PnLTracker (existing)
```

### Data Flow

```
User Action
    ↓
UI Component
    ↓
React Hook (useRealTrading / useRiskManager)
    ↓
Zustand Store (state management)
    ↓
API Client (real-trading-api.ts)
    ↓
Risk Manager (validation)
    ↓
Binance API (or local simulation)
```

## Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Check existing GitHub issues
4. Create new issue with details

## Future Enhancements

Planned features:
- [ ] WebSocket integration for real-time updates
- [ ] Order history and trade logging
- [ ] Advanced analytics dashboard
- [ ] Multi-account support
- [ ] Advanced order types (OCO, trailing)
- [ ] API key management UI
- [ ] Portfolio performance metrics
- [ ] Trade journaling

## License

This project is part of the AI Trading v2 platform. See main repository for license information.
