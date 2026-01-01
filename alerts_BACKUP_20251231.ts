export type UserAlertType =
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'RSI_THRESHOLD'
  | 'MACD_SIGNAL'
  | 'VOLUME_SPIKE';

export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'EXPIRED' | 'DISABLED';

export interface UserAlert {
  id: string;
  symbol: string;
  type: UserAlertType;
  message: string;
  status:  AlertStatus;
  enabled: boolean;
  condition:  Record<string, any>;
  created_at: string;
  triggered_at?:  string;
  expires_at?:  string;
  repeat:  boolean;
}

export interface CreateAlertRequest {
  symbol: string;
  alert_type: UserAlertType;
  condition: Record<string, any>;
  message: string;
  expires_in_hours?: number;
  repeat?: boolean;
}
