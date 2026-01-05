"""Tests for DataFrame utility functions."""
import pytest
import pandas as pd
from lib.dataframe_utils import is_dataframe_valid, get_latest_price, dataframe_to_dict_safe


class TestIsDataFrameValid:
    """Tests for is_dataframe_valid function."""

    def test_valid_dataframe(self):
        """Test with a valid non-empty DataFrame."""
        df = pd.DataFrame({'close': [100.0, 101.0, 102.0]})
        assert is_dataframe_valid(df) is True

    def test_empty_dataframe(self):
        """Test with an empty DataFrame."""
        df = pd.DataFrame()
        assert is_dataframe_valid(df) is False

    def test_none_input(self):
        """Test with None input."""
        assert is_dataframe_valid(None) is False

    def test_valid_dict(self):
        """Test with a valid dict (from cache)."""
        data = {'close': [100.0, 101.0], 'timestamp': ['2024-01-01', '2024-01-02']}
        assert is_dataframe_valid(data) is True

    def test_empty_dict(self):
        """Test with an empty dict."""
        assert is_dataframe_valid({}) is False

    def test_dict_with_empty_lists(self):
        """Test with a dict containing empty lists."""
        data = {'close': [], 'timestamp': []}
        assert is_dataframe_valid(data) is False


class TestGetLatestPrice:
    """Tests for get_latest_price function."""

    def test_valid_dataframe_with_close(self):
        """Test extracting price from valid DataFrame."""
        df = pd.DataFrame({'close': [100.0, 101.0, 102.0]})
        assert get_latest_price(df) == 102.0

    def test_valid_dict_with_close(self):
        """Test extracting price from valid dict."""
        data = {'close': [100.0, 101.0, 102.0]}
        assert get_latest_price(data) == 102.0

    def test_empty_dataframe(self):
        """Test with empty DataFrame."""
        df = pd.DataFrame()
        assert get_latest_price(df) is None

    def test_none_input(self):
        """Test with None input."""
        assert get_latest_price(None) is None

    def test_custom_price_column(self):
        """Test with custom price column."""
        df = pd.DataFrame({'high': [100.0, 101.0, 102.0]})
        assert get_latest_price(df, 'high') == 102.0

    def test_missing_price_column(self):
        """Test with missing price column."""
        df = pd.DataFrame({'open': [100.0, 101.0]})
        assert get_latest_price(df) is None

    def test_string_to_float_conversion(self):
        """Test that string prices are converted to float."""
        df = pd.DataFrame({'close': ['100.0', '101.0', '102.5']})
        result = get_latest_price(df)
        assert result == 102.5
        assert isinstance(result, float)


class TestDataFrameToDictSafe:
    """Tests for dataframe_to_dict_safe function."""

    def test_valid_dataframe(self):
        """Test converting valid DataFrame to dict."""
        df = pd.DataFrame({
            'timestamp': ['2024-01-01', '2024-01-02'],
            'close': [100.0, 101.0]
        })
        result = dataframe_to_dict_safe(df)
        assert result is not None
        assert len(result) == 2
        assert result[0]['close'] == 100.0
        assert result[1]['close'] == 101.0

    def test_empty_dataframe(self):
        """Test with empty DataFrame."""
        df = pd.DataFrame()
        assert dataframe_to_dict_safe(df) is None

    def test_none_input(self):
        """Test with None input."""
        assert dataframe_to_dict_safe(None) is None

    def test_already_dict(self):
        """Test with dict input (already converted)."""
        data = {'close': [100.0, 101.0]}
        result = dataframe_to_dict_safe(data)
        assert result == data


class TestIntegrationScenarios:
    """Integration tests for real-world scenarios."""

    def test_binance_klines_simulation(self):
        """Simulate Binance klines DataFrame processing."""
        # Simulate DataFrame from binance_service.get_klines_data()
        klines = pd.DataFrame({
            'timestamp': ['2024-01-01T00:00:00', '2024-01-01T00:01:00'],
            'open': [50000.0, 50100.0],
            'high': [50200.0, 50300.0],
            'low': [49900.0, 50000.0],
            'close': [50100.0, 50200.0],
            'volume': [100.0, 150.0]
        })

        # Test validation
        assert is_dataframe_valid(klines) is True

        # Test price extraction
        latest_price = get_latest_price(klines, 'close')
        assert latest_price == 50200.0

        # Test conversion to dict
        klines_dict = dataframe_to_dict_safe(klines)
        assert klines_dict is not None
        assert len(klines_dict) == 2
        assert klines_dict[-1]['close'] == 50200.0

    def test_empty_market_data(self):
        """Test handling of empty market data response."""
        klines = pd.DataFrame()

        assert is_dataframe_valid(klines) is False
        assert get_latest_price(klines) is None
        assert dataframe_to_dict_safe(klines) is None

    def test_none_market_data(self):
        """Test handling of None market data response."""
        klines = None

        assert is_dataframe_valid(klines) is False
        assert get_latest_price(klines) is None
        assert dataframe_to_dict_safe(klines) is None
