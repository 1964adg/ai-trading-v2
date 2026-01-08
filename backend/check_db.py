"""
DB diagnostic script.

Prints which database URLs are active (from config.settings) and lists tables
for the market database.

Usage (PowerShell):
  python .\check_db.py
  $Env:TESTING="true"; python .\check_db.py
"""

from sqlalchemy import inspect

from config import settings
from lib.database import init_database, engines


def main() -> None:
    print("TRADING_DATABASE_URL:", settings.TRADING_DATABASE_URL)
    print("MARKET_DATABASE_URL:", settings.MARKET_DATABASE_URL)
    print("ANALYTICS_DATABASE_URL:", settings.ANALYTICS_DATABASE_URL)

    init_database()

    if "market" not in engines:
        raise SystemExit("Market engine not initialized")

    inspector = inspect(engines["market"])
    tables = inspector.get_table_names()
    print("Tables:", sorted(tables))
    print("orderbook_snapshots exists:", "orderbook_snapshots" in tables)


if __name__ == "__main__":
    main()
