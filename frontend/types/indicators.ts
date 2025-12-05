/**
 * VWAP and Volume Profile Indicator Types
 * Professional-grade indicators for scalping operations
 */

// VWAP Configuration
export interface VWAPConfig {
  period: 'session' | 'rolling' | number;
  source: 'close' | 'hlc3' | 'ohlc4';
  bands: number[]; // Standard deviations [1, 2, 3]
  enabled: boolean;
  showBands: boolean;
  color: string;
  bandColor: string;
}

// VWAP Data Point
export interface VWAPData {
  timestamp: number;
  vwap: number;
  upperBands: number[];
  lowerBands: number[];
  volume: number;
  priceVolume: number;
}

// Volume Profile Configuration
export interface VolumeProfileConfig {
  bins: number; // Number of price bins (50, 100, 200)
  valueAreaPercent: number; // Default 70% for value area
  period: 'session' | 'week' | 'custom';
  enabled: boolean;
  showPOC: boolean; // Point of Control
  showValueArea: boolean;
  showNodes: boolean;
  opacity: number;
  position: 'left' | 'right';
  color: string;
  pocColor: string;
  valueAreaColor: string;
}

// Volume Node
export interface VolumeNode {
  price: number;
  volume: number;
  percentage: number; // Percentage of total volume
}

// Volume Profile Data
export interface VolumeProfileData {
  nodes: VolumeNode[];
  poc: number; // Point of Control - price with highest volume
  vah: number; // Value Area High - top of 70% volume area
  val: number; // Value Area Low - bottom of 70% volume area
  totalVolume: number;
  maxVolume: number; // Maximum volume in any node
}

// Combined Indicator Settings
export interface IndicatorSettings {
  vwap: VWAPConfig;
  volumeProfile: VolumeProfileConfig;
}

// Default configurations
export const DEFAULT_VWAP_CONFIG: VWAPConfig = {
  period: 'session',
  source: 'hlc3',
  bands: [1, 2],
  enabled: false,
  showBands: true,
  color: '#4ECDC4',
  bandColor: '#95E1D3',
};

export const DEFAULT_VOLUME_PROFILE_CONFIG: VolumeProfileConfig = {
  bins: 50,
  valueAreaPercent: 70,
  period: 'session',
  enabled: false,
  showPOC: true,
  showValueArea: true,
  showNodes: true,
  opacity: 0.6,
  position: 'right',
  color: '#88D8C0',
  pocColor: '#FFD93D',
  valueAreaColor: '#A8E6CF',
};
