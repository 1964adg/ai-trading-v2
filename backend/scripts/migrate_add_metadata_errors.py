"""
Migration script to add error reporting columns to candlestick_metadata.
Compatible with both PostgreSQL and SQLite.

Usage (from backend directory):
    python scripts/migrate_add_metadata_errors.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from lib.database import init_database, get_db


def migrate():
    """Add error reporting columns to candlestick_metadata."""
    print("[MIGRATION] Adding error reporting columns to candlestick_metadata...")

    init_database()

    db_gen = get_db("market")
    db = next(db_gen)
    try:
        # Check if columns already exist
        check_query = text(
            """
            SELECT COUNT(*) as cnt
            FROM pragma_table_info('candlestick_metadata')
            WHERE name = 'error_code'
        """
        )
        # ... altre operazioni ...
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

        try:
            # Try SQLite pragma first
            result = db.execute(check_query).scalar()
            if result > 0:
                print("[MIGRATION] Columns already exist. Skipping.")
                return
        except Exception:
            # Not SQLite, use PostgreSQL information_schema
            check_query = text(
                """
                SELECT COUNT(*) as cnt
                FROM information_schema.columns
                WHERE table_name = 'candlestick_metadata'
                AND column_name = 'error_code'
            """
            )
            result = db.execute(check_query).scalar()
            if result > 0:
                print("[MIGRATION] Columns already exist. Skipping.")
                return

        # Add columns - each ALTER TABLE is atomic in both PostgreSQL and SQLite
        try:
            print("[MIGRATION] Adding error_code column...")
            db.execute(
                text("ALTER TABLE candlestick_metadata ADD COLUMN error_code VARCHAR")
            )

            print("[MIGRATION] Adding error_message column...")
            db.execute(
                text(
                    "ALTER TABLE candlestick_metadata ADD COLUMN error_message VARCHAR"
                )
            )

            print("[MIGRATION] Adding last_attempt_at column...")
            db.execute(
                text(
                    "ALTER TABLE candlestick_metadata ADD COLUMN last_attempt_at TIMESTAMP WITH TIME ZONE"
                )
            )

            print("[MIGRATION] Adding last_success_at column...")
            db.execute(
                text(
                    "ALTER TABLE candlestick_metadata ADD COLUMN last_success_at TIMESTAMP WITH TIME ZONE"
                )
            )

            db.commit()
            print("[MIGRATION] ✅ Migration completed successfully!")
        except Exception as e:
            db.rollback()
            print(f"[MIGRATION] ❌ Migration failed: {e}")
            raise


if __name__ == "__main__":
    migrate()
