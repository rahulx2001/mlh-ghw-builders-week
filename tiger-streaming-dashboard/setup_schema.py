#!/usr/bin/env python3
"""Apply sql/001_schema.sql to the configured database."""

from __future__ import annotations

from pathlib import Path

from db import connect

SQL_PATH = Path(__file__).resolve().parent / "sql" / "001_schema.sql"


def main() -> None:
    sql = SQL_PATH.read_text()
    with connect() as conn:
        conn.execute(sql)
        ext = conn.execute(
            "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'"
        ).fetchone()
        ht = conn.execute(
            """
            SELECT hypertable_name, num_dimensions
            FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'live_sensor_events'
            """
        ).fetchone()
        caggs = conn.execute(
            """
            SELECT view_name, materialization_hypertable_name
            FROM timescaledb_information.continuous_aggregates
            WHERE view_name IN ('live_sensor_stats_10s', 'live_sensor_stats_1min')
            ORDER BY view_name
            """
        ).fetchall()
    print("timescaledb extension:", ext["extversion"] if ext else "MISSING")
    print("hypertable live_sensor_events:", "yes" if ht else "NO")
    print("continuous aggregates:")
    for row in caggs:
        print(f"  - {row['view_name']} -> {row['materialization_hypertable_name']}")


if __name__ == "__main__":
    main()
