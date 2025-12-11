"""
Training Command-Line Interface
"""
import asyncio
import argparse
import sys
from pathlib import Path

# Add parent directory to path
sys.path. insert(0, str(Path(__file__).parent.parent. parent. parent))

from app.ml.training.pipeline import TrainingPipeline


async def main():
    parser = argparse.ArgumentParser(description="Train ML models")
    parser.add_argument("--model", choices=["price", "pattern", "all"], default="price")
    parser.add_argument("--symbol", default="BTCUSDT")
    parser.add_argument("--interval", default="1h", choices=["1m", "5m", "15m", "1h", "4h", "1d"])
    parser.add_argument("--days", type=int, default=30, help="Days of historical data to download")
    
    args = parser.parse_args()
    
    pipeline = TrainingPipeline()
    
    df = await pipeline.prepare_data(args.symbol, args.interval, args.days)
    
    if len(df) == 0:
        print("❌ No data available for training")
        return
    
    if args.model in ["price", "all"]:
        results = pipeline.train_price_predictor(df, args.symbol, args.interval)
        print(f"\n{'='*60}")
        print(f"✅ TRAINING COMPLETE!")
        print(f"{'='*60}")
        print(f"   Model: {results['model_path']}")
        print(f"   Features: {results['feature_count']}")
        print(f"   Train samples: {results['train_samples']}")
        print(f"   Test samples: {results['test_samples']}")

if __name__ == "__main__":
    asyncio.run(main())