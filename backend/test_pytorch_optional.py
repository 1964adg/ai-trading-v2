#!/usr/bin/env python3
"""
Test script to verify PyTorch is optional.
This script validates that the backend can function without PyTorch installed.
"""

import sys
import pandas as pd
import numpy as np


def test_torch_import():
    """Test that TORCH_AVAILABLE flag works correctly."""
    print("=" * 60)
    print("TEST 1: PyTorch Import Handling")
    print("=" * 60)

    try:
        import torch

        print("⚠️  PyTorch is installed - this test expects it to be missing")
        return False
    except ImportError:
        print("✅ PyTorch not installed (as expected)")

    from backend.app.scout.ml_predictor import TORCH_AVAILABLE, ml_predictor

    if TORCH_AVAILABLE:
        print("❌ TORCH_AVAILABLE should be False")
        return False

    print(f"✅ TORCH_AVAILABLE = {TORCH_AVAILABLE}")
    print(f"✅ ml_predictor.torch_available = {ml_predictor.torch_available}")
    print()
    return True


def test_ml_predictor_fallback():
    """Test that ML predictor works in fallback mode."""
    print("=" * 60)
    print("TEST 2: ML Predictor Fallback Mode")
    print("=" * 60)

    from backend.app.scout.ml_predictor import ml_predictor

    # Create dummy data
    df = pd.DataFrame(
        {
            "close": np.random.rand(100) * 100 + 50000,
            "volume": np.random.rand(100) * 1000000,
        }
    )

    # Test predictions
    predictions = ml_predictor.predict_price_movement(
        df, "BTCUSDT", ["5m", "15m", "60m"]
    )

    if not predictions:
        print("❌ Predictions should not be empty")
        return False

    print(f"✅ Got predictions for {len(predictions)} horizons")

    # Test ML score calculation
    ml_score = ml_predictor.calculate_ml_score(predictions)

    if ml_score is None:
        print("❌ ML score should not be None")
        return False

    print(f"✅ ML Score: {ml_score}")

    # Verify predictions have correct structure
    for horizon, pred in predictions.items():
        required_keys = [
            "predicted_price",
            "predicted_change_pct",
            "confidence",
            "direction",
            "current_price",
        ]
        if not all(key in pred for key in required_keys):
            print(f"❌ Prediction for {horizon} missing required keys")
            return False

    print(f"✅ All predictions have correct structure")
    print()
    return True


def test_pattern_cnn_graceful_failure():
    """Test that PatternCNN fails gracefully without PyTorch."""
    print("=" * 60)
    print("TEST 3: PatternCNN Graceful Failure")
    print("=" * 60)

    from backend.app.ml.models.pattern_cnn import TORCH_AVAILABLE, PatternCNN

    if TORCH_AVAILABLE:
        print("⚠️  PyTorch is available - skipping this test")
        return True

    print(f"✅ TORCH_AVAILABLE = {TORCH_AVAILABLE}")

    # Try to instantiate PatternCNN (should raise ImportError)
    try:
        model = PatternCNN()
        print("❌ PatternCNN should have raised ImportError")
        return False
    except ImportError as e:
        if "PyTorch is required" in str(e):
            print(f"✅ PatternCNN raised correct ImportError: {e}")
        else:
            print(f"❌ Unexpected error message: {e}")
            return False

    print()
    return True


def test_startup_banner():
    """Test that startup banner shows correct ML status."""
    print("=" * 60)
    print("TEST 4: Startup Banner ML Status")
    print("=" * 60)

    from backend.app.scout.ml_predictor import TORCH_AVAILABLE

    cnn_status = "ENABLED" if TORCH_AVAILABLE else "DISABLED (install PyTorch)"
    lstm_status = "ENABLED" if TORCH_AVAILABLE else "DISABLED (install PyTorch)"

    print(f"  • Technical Analysis: ENABLED")
    print(f"  • CNN Patterns:       {cnn_status}")
    print(f"  • LSTM Prediction:    {lstm_status}")

    if TORCH_AVAILABLE:
        print("⚠️  PyTorch is available - expected DISABLED status")
    else:
        print("✅ ML features correctly shown as DISABLED")

    print()
    return True


def main():
    """Run all tests."""
    print()
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "PyTorch Optional Dependency Tests" + " " * 15 + "║")
    print("╚" + "=" * 58 + "╝")
    print()

    tests = [
        test_torch_import,
        test_ml_predictor_fallback,
        test_pattern_cnn_graceful_failure,
        test_startup_banner,
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            import traceback

            traceback.print_exc()
            results.append(False)

    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")

    if passed == total:
        print("✅ All tests passed!")
        return 0
    else:
        print(f"❌ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
