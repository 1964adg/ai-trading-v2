/**
 * Order Flow Indicators Type Definitions
 * Professional-grade order flow analysis for scalping operations
 */

// Order Flow Configuration
export interface OrderFlowConfig {
  enabled: boolean;
  deltaEnabled: boolean;
  imbalanceEnabled: boolean;
  speedEnabled: boolean;
  alertThresholds: {
    deltaThreshold: number;      // Delta divergence threshold
    imbalanceThreshold: number;  // Imbalance alert level (0.7 = 70%)
    speedMultiplier: number;     // Speed alert multiplier
    volumeThreshold: number;     // Volume surge threshold
  };
}

// Order Flow Data Point
export interface OrderFlowData {
  timestamp: number;
  deltaVolume: number;        // Buy - Sell volume
  cumulativeDelta: number;    // Running total
  buyVolume: number;          // Aggressive buy volume
  sellVolume: number;         // Aggressive sell volume
  imbalanceRatio: number;     // Bid/Ask imbalance (-1 to 1)
  tickSpeed: number;          // Ticks per second
  volumeRate: number;         // Volume per second
  aggression: 'BUY' | 'SELL' | 'NEUTRAL'; // Market aggression
}

// Delta Volume Configuration
export interface DeltaVolumeConfig {
  period: number;             // Calculation period in minutes
  smoothing: number;          // EMA smoothing factor
  showCumulative: boolean;    // Show cumulative delta line
  resetSession: boolean;      // Reset cumulative at session start
}

// Delta Volume Data Point
export interface DeltaVolumeData {
  timestamp: number;
  delta: number;              // Current bar delta
  cumulative: number;         // Cumulative since session start
  buyPressure: number;        // Buy pressure percentage (0-100)
  sellPressure: number;       // Sell pressure percentage (0-100)
  momentum: number;           // Delta momentum (change rate)
  divergence: DivergenceType | null; // Price/delta divergence
}

// Divergence Types
export type DivergenceType = 'BULLISH' | 'BEARISH' | 'HIDDEN_BULLISH' | 'HIDDEN_BEARISH';

// Divergence Signal
export interface DivergenceSignal {
  type: DivergenceType;
  timestamp: number;
  priceStart: number;
  priceEnd: number;
  deltaStart: number;
  deltaEnd: number;
  strength: number; // 0-100
}

// Market Depth Flow Configuration
export interface MarketDepthFlowConfig {
  levels: number;             // Number of orderbook levels to analyze
  flowThreshold: number;      // Significant flow threshold
  timeFrame: number;          // Analysis time frame (seconds)
}

// Flow Intensity Levels
export type FlowIntensity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

// Depth Flow Data Point
export interface DepthFlowData {
  timestamp: number;
  level: number;              // Price level
  bidFlow: number;            // Bid side flow intensity
  askFlow: number;            // Ask side flow intensity
  netFlow: number;            // Net flow (positive = buying pressure)
  flowIntensity: FlowIntensity;
}

// Flow Shift Detection
export interface FlowShift {
  timestamp: number;
  direction: 'BUY' | 'SELL';
  intensity: FlowIntensity;
  magnitude: number;
}

// Order Flow Alert Types
export type OrderFlowAlertType = 
  | 'DELTA_DIVERGENCE' 
  | 'IMBALANCE_EXTREME' 
  | 'SPEED_SURGE' 
  | 'VOLUME_SPIKE';

// Alert Severity Levels
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Action Recommendation
export type AlertAction = 'BUY' | 'SELL' | 'WATCH';

// Alert Data Types
export interface DeltaDivergenceAlertData {
  divergenceType: 'BULLISH' | 'BEARISH';
  priceChange: number;
  deltaChange: number;
}

export interface ImbalanceAlertData {
  imbalance: number;
  side: 'BUY' | 'SELL';
}

export interface SpeedSurgeAlertData {
  currentSpeed: number;
  avgSpeed: number;
  speedRatio: number;
}

export interface VolumeSpikeAlertData {
  volumeRate: number;
  avgRate: number;
  volumeRatio: number;
}

export type OrderFlowAlertData = 
  | DeltaDivergenceAlertData
  | ImbalanceAlertData
  | SpeedSurgeAlertData
  | VolumeSpikeAlertData;

// Order Flow Alert
export interface OrderFlowAlert {
  id: string;
  type: OrderFlowAlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  data: OrderFlowAlertData; // Alert-specific data
  symbol: string;
  action: AlertAction;
}

// Trade Data (from WebSocket)
export interface TradeData {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  isBuyerMaker: boolean; // true = sell aggression, false = buy aggression
}

// Orderbook Data
export interface OrderbookData {
  symbol: string;
  timestamp: number;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
}

// Candle Data (for divergence detection)
export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Default Configurations
export const DEFAULT_ORDER_FLOW_CONFIG: OrderFlowConfig = {
  enabled: false,
  deltaEnabled: true,
  imbalanceEnabled: true,
  speedEnabled: true,
  alertThresholds: {
    deltaThreshold: 500,
    imbalanceThreshold: 0.7,
    speedMultiplier: 3,
    volumeThreshold: 2,
  },
};

export const DEFAULT_DELTA_VOLUME_CONFIG: DeltaVolumeConfig = {
  period: 5,
  smoothing: 0.1,
  showCumulative: true,
  resetSession: true,
};

export const DEFAULT_MARKET_DEPTH_FLOW_CONFIG: MarketDepthFlowConfig = {
  levels: 10,
  flowThreshold: 1000,
  timeFrame: 60,
};
