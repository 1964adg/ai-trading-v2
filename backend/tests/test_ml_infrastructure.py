"""
Test ML infrastructure implementation
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def test_directory_structure():
    """Test that ML directory structure is created."""
    import os

    # Backend directories
    assert os.path.exists("app/ml"), "app/ml directory not found"
    assert os.path.exists("app/ml/features"), "app/ml/features directory not found"
    assert os.path.exists("app/ml/models"), "app/ml/models directory not found"
    assert os.path.exists("app/ml/inference"), "app/ml/inference directory not found"
    assert os.path.exists("app/ml/utils"), "app/ml/utils directory not found"

    # Infrastructure directories
    assert os.path.exists(
        "../infrastructure/ml/model_storage"
    ), "model_storage directory not found"
    assert os.path.exists(
        "../infrastructure/ml/training_data"
    ), "training_data directory not found"
    assert os.path.exists("../infrastructure/ml/mlflow"), "mlflow directory not found"

    print("✅ Directory structure test passed")


def test_imports():
    """Test that all modules can be imported."""
    from backend.app.ml.config import ml_config
    from backend.app.ml.features.technical_features import TechnicalFeatureExtractor
    from backend.app.ml.features.pattern_features import PatternFeatureExtractor
    from backend.app.ml.features.market_features import MarketFeatureExtractor
    from backend.app.ml.models.base_model import BaseMLModel
    from backend.app.ml.utils.preprocessing import DataPreprocessor
    from backend.app.ml.inference.predictor import MLPredictor
    from backend.services.ml_service import ml_service
    from backend.api.ml import router

    assert ml_config is not None, "ML config not loaded"
    assert TechnicalFeatureExtractor is not None, "TechnicalFeatureExtractor not loaded"
    assert PatternFeatureExtractor is not None, "PatternFeatureExtractor not loaded"
    assert MarketFeatureExtractor is not None, "MarketFeatureExtractor not loaded"
    assert BaseMLModel is not None, "BaseMLModel not loaded"
    assert DataPreprocessor is not None, "DataPreprocessor not loaded"
    assert MLPredictor is not None, "MLPredictor not loaded"
    assert ml_service is not None, "ml_service not loaded"
    assert router is not None, "ML router not loaded"

    print("✅ Import test passed")


def test_feature_extraction():
    """Test feature extraction on sample data."""
    import pandas as pd
    import numpy as np
    from backend.app.ml.features.technical_features import TechnicalFeatureExtractor
    from backend.app.ml.features.pattern_features import PatternFeatureExtractor
    from backend.app.ml.features.market_features import MarketFeatureExtractor

    # Create sample OHLCV data
    np.random.seed(42)
    n_samples = 300

    df = pd.DataFrame(
        {
            "open": np.random.uniform(100, 110, n_samples),
            "high": np.random.uniform(110, 120, n_samples),
            "low": np.random.uniform(90, 100, n_samples),
            "close": np.random.uniform(100, 110, n_samples),
            "volume": np.random.uniform(1000, 10000, n_samples),
        }
    )

    # Test technical features
    tech_extractor = TechnicalFeatureExtractor()
    df_tech = tech_extractor.extract(df.copy())
    assert len(df_tech.columns) > len(df.columns), "Technical features not extracted"

    # Test pattern features
    pattern_extractor = PatternFeatureExtractor()
    df_pattern = pattern_extractor.extract(df.copy())
    assert len(df_pattern.columns) > len(df.columns), "Pattern features not extracted"

    # Test market features
    market_extractor = MarketFeatureExtractor()
    df_market = market_extractor.extract(df.copy())
    assert len(df_market.columns) > len(df.columns), "Market features not extracted"

    print("✅ Feature extraction test passed")


def test_ml_config():
    """Test ML configuration."""
    from backend.app.ml.config import ml_config

    assert ml_config.PATTERN_SEQUENCE_LENGTH == 20, "Wrong pattern sequence length"
    assert ml_config.PATTERN_NUM_CLASSES == 15, "Wrong number of pattern classes"
    assert ml_config.PREDICTION_HORIZONS == [1, 5, 15, 60], "Wrong prediction horizons"
    assert ml_config.MIN_CONFIDENCE_THRESHOLD == 0.5, "Wrong confidence threshold"

    print("✅ ML config test passed")


def test_api_endpoints():
    """Test that API endpoints are registered."""
    from backend.api.ml import router

    routes = [route.path for route in router.routes if hasattr(route, "path")]

    assert "/ml/insights/{symbol}" in routes, "Insights endpoint not found"
    assert "/ml/patterns/{symbol}" in routes, "Patterns endpoint not found"
    assert (
        "/ml/price-prediction/{symbol}" in routes
    ), "Price prediction endpoint not found"
    assert "/ml/signals/{symbol}" in routes, "Signals endpoint not found"
    assert "/ml/status" in routes, "Status endpoint not found"

    print("✅ API endpoints test passed")


def test_ml_service():
    """Test ML service functionality."""
    from backend.services.ml_service import ml_service

    # Test model status
    status = ml_service.get_model_status()
    assert "pattern_cnn_loaded" in status, "Pattern CNN status not in response"
    assert "price_predictor_loaded" in status, "Price predictor status not in response"
    assert "models_loaded" in status, "Models loaded status not in response"

    # Models should not be loaded (not trained yet)
    assert status["models_loaded"] is False, "Models should not be loaded"

    print("✅ ML service test passed")


def test_preprocessing_utils():
    """Test preprocessing utilities."""
    import numpy as np
    import pandas as pd
    from backend.app.ml.utils.preprocessing import DataPreprocessor, normalize_ohlcv

    preprocessor = DataPreprocessor()

    # Test data cleaning
    df = pd.DataFrame({"a": [1, 2, np.nan, 4, 5], "b": [10, 20, 30, 40, 50]})
    df_clean = preprocessor.clean_data(df, remove_nan=True)
    assert len(df_clean) == 4, "NaN rows not removed"

    # Test OHLCV normalization
    ohlcv = np.array(
        [
            [100, 110, 90, 105, 1000],
            [105, 115, 95, 110, 1200],
            [110, 120, 100, 115, 1500],
        ]
    )
    normalized = normalize_ohlcv(ohlcv)
    assert (
        normalized.min() >= 0 and normalized[:, :4].max() <= 1
    ), "OHLCV not normalized correctly"

    print("✅ Preprocessing utilities test passed")


if __name__ == "__main__":
    print("Testing ML Infrastructure Implementation...\n")

    try:
        test_directory_structure()
        test_imports()
        test_ml_config()
        test_feature_extraction()
        test_preprocessing_utils()
        test_api_endpoints()
        test_ml_service()

        print("\n" + "=" * 50)
        print("✅ ALL TESTS PASSED")
        print("=" * 50)
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
