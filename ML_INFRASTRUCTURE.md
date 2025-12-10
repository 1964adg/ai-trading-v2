# ML Infrastructure Documentation

## Overview

This ML infrastructure provides a complete framework for AI-powered trading predictions, including pattern recognition, price prediction, and signal generation.

## 🏗️ Architecture

### Directory Structure

```
backend/app/ml/
├── __init__.py
├── config.py                    # ML configuration settings
├── features/                    # Feature extraction
│   ├── __init__.py
│   ├── technical_features.py   # 100+ technical indicators
│   ├── pattern_features.py     # Candlestick pattern features
│   └── market_features.py      # Market-level features
├── models/                      # ML models
│   ├── __init__.py
│   ├── base_model.py           # Abstract base class
│   ├── pattern_cnn.py          # PyTorch CNN for patterns
│   └── price_predictor.py      # Ensemble price predictor
├── inference/                   # Inference pipeline
│   ├── __init__.py
│   └── predictor.py            # ML prediction coordinator
└── utils/                       # Utilities
    ├── __init__.py
    └── preprocessing.py        # Data preprocessing

infrastructure/ml/
├── model_storage/              # Trained models
├── training_data/              # Training datasets
└── mlflow/                     # MLflow tracking

frontend/src/components/ML/
├── AIPredictionPanel.tsx       # Main AI panel
├── PatternConfidence.tsx       # Pattern display
└── MLInsights.tsx              # Model status
```

## 🔧 Components

### 1. Feature Extractors

#### Technical Features (100+ features)
- **Price-based**: returns, log_returns, price_range, body_size, shadows
- **Moving averages**: SMA/EMA for periods [5, 10, 20, 50, 100, 200]
- **Volatility**: ATR, rolling std, high/low ratio
- **Volume**: volume_sma, volume_ratio, OBV
- **Momentum**: RSI, MACD, Stochastic, CCI, ROC
- **Trend**: ADX, +DI, -DI
- **Lag features**: previous 1, 2, 3, 5, 10 candles
- **Rolling statistics**: mean, std, skew, kurtosis

#### Pattern Features
- Candlestick normalization within rolling window
- Body/shadow ratios and candle direction
- Consecutive patterns counting
- Multi-candle sequence features

#### Market Features
- Volume imbalance (buy/sell pressure)
- Volatility regime classification
- GARCH volatility estimation
- Liquidity proxies
- Market pressure indicators

### 2. ML Models

#### Pattern CNN
- **Architecture**: 3 convolutional blocks (32→64→128 channels)
- **Input**: [batch_size, sequence_length, 5] (OHLCV sequences)
- **Output**: 15 pattern probabilities
- **Patterns detected**:
  - doji, hammer, shooting_star
  - engulfing_bullish, engulfing_bearish
  - morning_star, evening_star
  - three_white_soldiers, three_black_crows
  - harami, piercing_line, dark_cloud_cover
  - tweezer_top, tweezer_bottom, marubozu

#### Price Predictor Ensemble
- **Models**: XGBoost, LightGBM, RandomForest
- **Horizons**: 1m, 5m, 15m, 60m
- **Ensemble weights**: 40% XGB, 40% LGBM, 20% RF
- **Output**: predictions with confidence scores

### 3. API Endpoints

```bash
# Get comprehensive ML insights
GET /api/ml/insights/{symbol}?timeframe=1m

# Get pattern predictions only
GET /api/ml/patterns/{symbol}?timeframe=1m

# Get price predictions only
GET /api/ml/price-prediction/{symbol}?timeframe=1m

# Get trading signals only
GET /api/ml/signals/{symbol}?timeframe=1m

# Get ML model status
GET /api/ml/status
```

### 4. Frontend Components

#### AIPredictionPanel
- Displays overall confidence score
- Shows strongest detected pattern
- Multi-horizon price predictions
- AI-generated trading signals
- Auto-refresh every 30 seconds

#### PatternConfidence
- Individual pattern confidences
- Visual confidence bars
- Sorted by confidence level

#### MLInsights
- Model loading status
- Performance metrics
- Last update timestamp

## 📦 Dependencies

### Backend
```txt
# Machine Learning
scikit-learn==1.4.0
xgboost==2.0.3
lightgbm==4.6.0  # Patched - fixes RCE vulnerability
torch==2.6.0  # Patched - fixes heap overflow, use-after-free, and RCE vulnerabilities
torchvision==0.21.0
ta==0.11.0
pandas-ta==0.3.14b
joblib==1.3.2
numpy>=1.24.0
pandas>=2.0.0
```

## 🚀 Usage

### Backend

```python
from services.ml_service import ml_service

# Get ML insights
insights = ml_service.get_ml_insights("BTCUSDT", timeframe="1m")

# Access predictions
patterns = insights['patterns']['detected']
price_predictions = insights['price_predictions']
signals = insights['signals']
```

### Frontend

```tsx
import AIPredictionPanel from '@/src/components/ML/AIPredictionPanel';

// In your component
<AIPredictionPanel symbol="BTCUSDT" timeframe="1m" />
```

## 🧪 Testing

Run the test suite:

```bash
cd backend
python tests/test_ml_infrastructure.py
```

Expected output:
```
✅ Directory structure test passed
✅ Import test passed
✅ ML config test passed
✅ Feature extraction test passed
✅ Preprocessing utilities test passed
✅ API endpoints test passed
✅ ML service test passed

✅ ALL TESTS PASSED
```

## ⚙️ Configuration

Edit `backend/app/ml/config.py`:

```python
class MLConfig(BaseSettings):
    MODEL_STORAGE_PATH: str = "infrastructure/ml/model_storage"
    TRAINING_DATA_PATH: str = "infrastructure/ml/training_data"
    PATTERN_SEQUENCE_LENGTH: int = 20
    PATTERN_NUM_CLASSES: int = 15
    PREDICTION_HORIZONS: list = [1, 5, 15, 60]
    ML_CACHE_TTL: int = 30  # seconds
    MIN_CONFIDENCE_THRESHOLD: float = 0.5
```

## 🔄 Current Status

### ✅ Implemented
- Complete directory structure
- Feature extraction pipeline (100+ features)
- ML models (Pattern CNN, Price Predictor)
- Inference pipeline
- API endpoints (5 endpoints)
- Frontend components
- Error handling for missing models
- Graceful degradation without ML libraries

### ⏳ Pending (FASE 2)
- Model training pipeline
- Historical data collection
- Model evaluation and metrics
- Hyperparameter tuning
- MLflow integration
- Automated retraining

## 📊 API Response Format

### ML Insights Endpoint

```json
{
  "symbol": "BTCUSDT",
  "patterns": {
    "detected": {
      "hammer": 0.85,
      "doji": 0.62
    },
    "count": 2,
    "strongest": ["hammer", 0.85]
  },
  "price_predictions": {
    "1": {
      "prediction": 43250.5,
      "xgboost": 43200.0,
      "lightgbm": 43300.0,
      "random_forest": 43250.0,
      "confidence": 0.78,
      "std": 50.5
    },
    "5": { ... },
    "15": { ... },
    "60": { ... }
  },
  "signals": [
    {
      "type": "BUY",
      "source": "Pattern: hammer",
      "reason": "Hammer pattern detected",
      "confidence": 0.85
    }
  ],
  "confidence": 0.75,
  "timestamp": "2024-12-10T20:53:00",
  "current_price": 43000.0,
  "model_status": {
    "pattern_cnn_loaded": false,
    "price_predictor_loaded": false,
    "models_loaded": false
  }
}
```

## 🛡️ Error Handling

The system handles missing dependencies gracefully:
- Works without PyTorch (Pattern CNN disabled)
- Works without XGBoost/LightGBM (Price Predictor disabled)
- Returns appropriate error messages
- Logs warnings for missing models
- Frontend shows "Models not trained yet" message

## 🔐 Security

- No security vulnerabilities detected (CodeQL)
- All user inputs validated
- No sensitive data exposure
- Safe handling of file paths

## 📝 Notes

- Models are **untrained** by default
- Training pipeline is part of FASE 2
- Feature extraction works with live data
- System handles missing models gracefully
- All code follows project patterns (type hints, docstrings, error handling)

## 🎯 Next Steps (FASE 2)

1. Implement training pipeline
2. Collect historical data
3. Train Pattern CNN
4. Train Price Predictor ensemble
5. Evaluate and tune models
6. Set up automated retraining
7. Integrate MLflow for experiment tracking

---

**Status**: ✅ Infrastructure Complete | ⏳ Training Pending
