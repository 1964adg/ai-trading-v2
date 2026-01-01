# PyTorch Optional Dependency

## Overview

PyTorch is now an **optional dependency** for the AI Trading Backend. The system can function perfectly without it, using technical indicator-based analysis. PyTorch is only required for advanced ML features like CNN pattern recognition and LSTM price prediction.

## Changes Made

### 1. Optional Import Handling

**File: `backend/app/scout/ml_predictor.py`**
- Added try/except around PyTorch import
- Introduced `TORCH_AVAILABLE` flag to track PyTorch availability
- Added informative startup messages
- MLPredictor now checks availability before attempting to use PyTorch

**File: `backend/app/ml/models/pattern_cnn.py`**
- Added try/except around PyTorch imports
- Fixed type hints to work without PyTorch
- PatternCNN raises informative ImportError when instantiated without PyTorch

### 2. Graceful Fallback

**File: `backend/app/scout/scout_service.py`**
- Already had try/except around ML predictions
- Falls back to neutral score (50.0) when ML fails
- No changes needed - already robust!

### 3. Startup Banner

**File: `backend/main.py`**
- Imports `TORCH_AVAILABLE` flag
- Shows ML feature status in startup banner
- Displays "DISABLED (install PyTorch)" when not available

### 4. Requirements Documentation

**File: `backend/requirements.txt`**
- Added comment section for optional dependencies
- Documented how to install PyTorch
- Explained what features require PyTorch

## Testing

### Test Without PyTorch

```bash
# 1. Ensure torch is NOT installed
pip uninstall torch torchvision torchaudio -y

# 2. Install base requirements
pip install -r requirements.txt

# 3. Run test suite
python test_pytorch_optional.py

# Expected output:
# ✅ All tests passed!
```

### Test With PyTorch

```bash
# 1. Install PyTorch (CPU version)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 2. Run backend
uvicorn main:app --reload

# Expected: Startup banner shows "ENABLED" for ML features
```

## What Works WITHOUT PyTorch

✅ **Core Functionality**
- Scout service (technical indicators)
- RSI, MACD, Bollinger Bands analysis
- Volume analysis
- Momentum scoring
- Signal generation (BUY/SELL/NEUTRAL)
- All API endpoints
- WebSocket real-time data
- Paper trading
- Portfolio management

## What REQUIRES PyTorch

❌ **Advanced ML Features**
- CNN-based candlestick pattern recognition
- LSTM price prediction
- Deep learning model training
- Neural network-based scoring

## Installation Guide

### For Development (No ML)

```bash
# Install base dependencies only
pip install -r requirements.txt

# Start backend
uvicorn main:app --reload
```

### For Production with ML

```bash
# Install base dependencies
pip install -r requirements.txt

# Install PyTorch (CPU version - smaller, faster for inference)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Or GPU version (if you have CUDA available)
pip install torch torchvision torchaudio

# Start backend
uvicorn main:app --reload
```

## Startup Messages

### Without PyTorch

```
⚠️  PyTorch not installed - CNN pattern detection disabled
   Install with: pip install torch
   Scout will use technical indicators only

ML FEATURES:
  • Technical Analysis: ENABLED
  • CNN Patterns:       DISABLED (install PyTorch)
  • LSTM Prediction:    DISABLED (install PyTorch)
```

### With PyTorch

```
✅ PyTorch available - CNN pattern detection enabled

ML FEATURES:
  • Technical Analysis: ENABLED
  • CNN Patterns:       ENABLED
  • LSTM Prediction:    ENABLED
```

## Acceptance Criteria

- [x] Backend starts without PyTorch installed (no crash)
- [x] Warning message displayed when PyTorch not available
- [x] Scout service works with technical indicators only (fallback)
- [x] All PyTorch-dependent methods check `TORCH_AVAILABLE` before using torch
- [x] No `ModuleNotFoundError: No module named 'torch'`
- [x] Startup banner shows ML feature status
- [x] requirements.txt documents optional PyTorch installation
- [x] No breaking changes to existing functionality
- [x] Code comments explain fallback behavior

## Benefits

1. **Faster Development Setup** - Developers can get started without downloading 700MB-2GB PyTorch
2. **Smaller Docker Images** - Production deployments without ML can be much smaller
3. **Flexible Deployment** - Choose ML features based on deployment needs
4. **Progressive Enhancement** - Start simple, add ML later when needed
5. **Better Error Messages** - Clear guidance when ML features are attempted without PyTorch

## Future Work

- Add ability to hot-reload ML models when PyTorch is installed later
- Add API endpoint to check ML feature availability
- Add frontend indicators for available ML features
- Consider making other ML libraries optional (scikit-learn, lightgbm)
