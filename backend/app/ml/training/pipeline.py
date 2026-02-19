"""
ML Training Pipeline
End-to-end training orchestration
"""

import pandas as pd
import numpy as np
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from backend.app.ml.data.collector import BinanceDataCollector
from backend.app.ml.features.technical_features import TechnicalFeatureExtractor
from backend.app.ml.features.pattern_features import PatternFeatureExtractor
from backend.app.ml.features.market_features import MarketFeatureExtractor
from backend.app.ml.models.price_predictor import PricePredictionEnsemble
from backend.app.ml.config import ml_config


class TrainingPipeline:
    """Orchestrates end-to-end ML training"""

    def __init__(self):
        self.collector = BinanceDataCollector()
        self.tech_extractor = TechnicalFeatureExtractor()
        self.pattern_extractor = PatternFeatureExtractor()
        self.market_extractor = MarketFeatureExtractor()

        self.model_dir = Path(ml_config.MODEL_STORAGE_PATH)
        self.model_dir.mkdir(parents=True, exist_ok=True)

    async def prepare_data(
        self, symbol: str, interval: str, days: int = 90
    ) -> pd.DataFrame:
        """Download and prepare training data"""
        print(f"\n{'='*60}")
        print(f"📊 DATA PREPARATION")
        print(f"{'='*60}")

        df = self.collector.load_data(symbol, interval)

        if df is None or len(df) < 1000:
            df = await self.collector.download_historical_data(symbol, interval, days)
            if len(df) > 0:
                self.collector.save_data(df, symbol, interval)

        return df

    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract all features"""
        print(f"\n{'='*60}")
        print(f"🔧 FEATURE EXTRACTION")
        print(f"{'='*60}")

        df = self.tech_extractor.extract_features(df.copy())
        print(f"  ✅ Technical features: {len(self.tech_extractor.feature_columns)}")

        df = self.pattern_extractor.extract(df)
        print(f"  ✅ Pattern features added")

        df = self.market_extractor.extract(df)
        print(f"  ✅ Market features added")

        return df

    def create_targets(self, df: pd.DataFrame) -> Dict[int, pd.Series]:
        """Create prediction targets for different horizons"""
        targets = {}

        for horizon in ml_config.PREDICTION_HORIZONS:
            targets[horizon] = df["close"].pct_change(horizon).shift(-horizon) * 100

        return targets

    def train_price_predictor(
        self, df: pd.DataFrame, symbol: str, interval: str
    ) -> Dict:
        """Train price prediction ensemble"""
        print(f"\n{'='*60}")
        print(f"🤖 TRAINING PRICE PREDICTOR")
        print(f"{'='*60}")

        df_features = self.extract_features(df.copy())
        targets = self.create_targets(df_features)

        feature_cols = [
            col
            for col in df_features.columns
            if col not in ["timestamp", "open", "high", "low", "close", "volume"]
        ]

        X = df_features[feature_cols]

        split_idx = int(len(X) * ml_config.TRAIN_TEST_SPLIT)
        X_train = X.iloc[:split_idx]
        y_train = {h: targets[h].iloc[:split_idx] for h in targets}
        X_test = X.iloc[split_idx:]
        y_test = {h: targets[h].iloc[split_idx:] for h in targets}

        print(f"  📊 Train size: {len(X_train)}, Test size: {len(X_test)}")

        model = PricePredictionEnsemble(horizons=ml_config.PREDICTION_HORIZONS)

        try:
            model.train(X_train, y_train)
            metrics = self._evaluate_price_model(model, X_test, y_test)
        except Exception as e:
            print(f"  ⚠️ Training failed: {e}")
            metrics = {}

        model_path = (
            self.model_dir
            / f"price_predictor_{symbol}_{interval}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pkl"
        )

        try:
            model.save(str(model_path))
            print(f"  💾 Saved to {model_path.name}")
        except Exception as e:
            print(f"  ⚠️ Could not save model: {e}")

        return {
            "model_path": str(model_path),
            "metrics": metrics,
            "feature_count": len(feature_cols),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        }

    def _evaluate_price_model(
        self,
        model: PricePredictionEnsemble,
        X_test: pd.DataFrame,
        y_test: Dict[int, pd.Series],
    ) -> Dict:
        """Evaluate model performance"""
        try:
            from sklearn.metrics import (
                mean_squared_error,
                mean_absolute_error,
                r2_score,
            )
        except ImportError:
            print("  ⚠️ sklearn not available for evaluation")
            return {}

        metrics = {}

        for horizon in model.horizons:
            preds = []
            actuals = []

            for i in range(min(len(X_test), 100)):
                try:
                    pred_dict = model.predict(X_test.iloc[i : i + 1])
                    if horizon in pred_dict:
                        preds.append(pred_dict[horizon]["prediction"])
                        actuals.append(y_test[horizon].iloc[i])
                except:
                    continue

            if len(preds) > 10:
                valid_idx = ~(pd.Series(actuals).isna() | pd.Series(preds).isna())
                preds_clean = pd.Series(preds)[valid_idx]
                actuals_clean = pd.Series(actuals)[valid_idx]

                if len(preds_clean) > 0:
                    rmse = np.sqrt(mean_squared_error(actuals_clean, preds_clean))
                    mae = mean_absolute_error(actuals_clean, preds_clean)
                    r2 = r2_score(actuals_clean, preds_clean)

                    metrics[f"{horizon}m"] = {
                        "rmse": float(rmse),
                        "mae": float(mae),
                        "r2": float(r2),
                    }

                    print(
                        f"  📈 {horizon}m - RMSE: {rmse:.4f}, MAE: {mae:.4f}, R²: {r2:.4f}"
                    )

        return metrics
