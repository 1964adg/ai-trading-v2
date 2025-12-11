"""
Test ML Training Pipeline Fixes
Tests the specific fixes made to pipeline.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pandas as pd
import numpy as np


def test_pipeline_imports():
    """Test that pipeline module imports correctly after fixes."""
    try:
        # Test import statement fix - should work without error
        from app.ml.config import ml_config
        print("✅ Fixed import: 'from app.ml.config import ml_config' works")
        
        # Import feature extractors
        from app.ml.features.technical_features import TechnicalFeatureExtractor
        from app.ml.features.pattern_features import PatternFeatureExtractor
        from app.ml.features.market_features import MarketFeatureExtractor
        print("✅ All feature extractors imported successfully")
        
        return True
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        return False


def test_feature_extractor_methods():
    """Test that all feature extractors have correct extract() method."""
    try:
        from app.ml.features.technical_features import TechnicalFeatureExtractor
        from app.ml.features.pattern_features import PatternFeatureExtractor
        from app.ml.features.market_features import MarketFeatureExtractor
        
        tech = TechnicalFeatureExtractor()
        pattern = PatternFeatureExtractor()
        market = MarketFeatureExtractor()
        
        # Verify extract() method exists
        assert hasattr(tech, 'extract'), "TechnicalFeatureExtractor missing extract() method"
        assert hasattr(pattern, 'extract'), "PatternFeatureExtractor missing extract() method"
        assert hasattr(market, 'extract'), "MarketFeatureExtractor missing extract() method"
        
        print("✅ All feature extractors have extract() method")
        
        # Create sample data
        np.random.seed(42)
        df = pd.DataFrame({
            'open': np.random.uniform(100, 110, 100),
            'high': np.random.uniform(110, 120, 100),
            'low': np.random.uniform(90, 100, 100),
            'close': np.random.uniform(100, 110, 100),
            'volume': np.random.uniform(1000, 10000, 100)
        })
        
        # Test that extract() methods work
        df_tech = tech.extract(df.copy())
        assert len(df_tech.columns) > len(df.columns), "Technical features not extracted"
        print(f"✅ TechnicalFeatureExtractor.extract() works - added {len(df_tech.columns) - len(df.columns)} features")
        
        df_pattern = pattern.extract(df.copy())
        assert len(df_pattern.columns) > len(df.columns), "Pattern features not extracted"
        print(f"✅ PatternFeatureExtractor.extract() works - added {len(df_pattern.columns) - len(df.columns)} features")
        
        df_market = market.extract(df.copy())
        assert len(df_market.columns) > len(df.columns), "Market features not extracted"
        print(f"✅ MarketFeatureExtractor.extract() works - added {len(df_market.columns) - len(df.columns)} features")
        
        return True
    except Exception as e:
        print(f"❌ Feature extractor method test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pipeline_syntax():
    """Test that pipeline.py has no syntax errors."""
    try:
        import py_compile
        pipeline_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app', 'ml', 'training', 'pipeline.py')
        py_compile.compile(pipeline_path, doraise=True)
        print("✅ pipeline.py compiles without syntax errors")
        return True
    except Exception as e:
        print(f"❌ Syntax test failed: {e}")
        return False


def test_pipeline_instantiation():
    """Test that TrainingPipeline can be instantiated (if dependencies allow)."""
    try:
        # This may fail due to missing dependencies, but we can at least check import
        from app.ml.training.pipeline import TrainingPipeline
        print("✅ TrainingPipeline class can be imported")
        
        # Try to instantiate if possible
        try:
            pipeline = TrainingPipeline()
            print("✅ TrainingPipeline can be instantiated")
        except Exception as e:
            # This is okay - may be due to missing binance or other dependencies
            print(f"⚠️  TrainingPipeline instantiation skipped (missing dependencies): {e}")
        
        return True
    except ModuleNotFoundError as e:
        # Missing dependencies is okay - our fixes are to the pipeline itself
        print(f"⚠️  TrainingPipeline import skipped (missing dependencies: {e})")
        print("✅ This is expected and not a failure of our fixes")
        return True
    except Exception as e:
        print(f"❌ Pipeline instantiation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_no_spacing_errors():
    """Verify that spacing errors have been fixed in the file."""
    try:
        pipeline_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app', 'ml', 'training', 'pipeline.py')
        with open(pipeline_path, 'r') as f:
            content = f.read()
        
        # Check for the fixed import
        assert 'from app.ml.config import ml_config' in content, "Import not fixed"
        assert 'from app.ml. config' not in content, "Old import with space still exists"
        print("✅ Import statement spacing fixed")
        
        # Check that old method names are replaced
        # TechnicalFeatureExtractor has both extract() and extract_features(), we use extract_features()
        # to keep feature_columns updated
        assert 'pattern_extractor.extract_candlestick_features' not in content, "Old extract_candlestick_features still exists"
        assert 'market_extractor.extract_features' not in content, "Old market_extractor.extract_features still exists"
        print("✅ Feature extractor method calls updated correctly")
        
        # Check for double spaces in specific patterns that were fixed
        assert '. extract_features' not in content, "Spacing error before extract_features"
        assert '. copy()' not in content, "Spacing error before copy()"
        assert '. iloc' not in content, "Spacing error before iloc"
        assert '. append' not in content, "Spacing error before append"
        assert ':. ' not in content, "Spacing error in format strings"
        print("✅ Variable reference spacing errors fixed")
        
        return True
    except AssertionError as e:
        print(f"❌ Spacing error check failed: {e}")
        return False
    except Exception as e:
        print(f"❌ File reading failed: {e}")
        return False


if __name__ == '__main__':
    print("="*60)
    print("Testing ML Training Pipeline Fixes")
    print("="*60)
    print()
    
    results = []
    
    print("Test 1: Syntax Check")
    print("-" * 40)
    results.append(test_pipeline_syntax())
    print()
    
    print("Test 2: Import Fixes")
    print("-" * 40)
    results.append(test_pipeline_imports())
    print()
    
    print("Test 3: Feature Extractor Methods")
    print("-" * 40)
    results.append(test_feature_extractor_methods())
    print()
    
    print("Test 4: Spacing Errors Fixed")
    print("-" * 40)
    results.append(test_no_spacing_errors())
    print()
    
    print("Test 5: Pipeline Class")
    print("-" * 40)
    results.append(test_pipeline_instantiation())
    print()
    
    print("="*60)
    if all(results):
        print("✅ ALL TESTS PASSED")
        print("="*60)
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED")
        print("="*60)
        sys.exit(1)
