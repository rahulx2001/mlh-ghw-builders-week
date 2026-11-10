#!/usr/bin/env python3
"""Run live queries and write the exact results to reports/."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from db import connect, service_label

OUT = Path(__file__).resolve().parent / "reports"
OUT.mkdir(exist_ok=True)


QUERIES = {
    "extension_and_hypertables.txt": """
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';

SELECT hypertable_schema, hypertable_name, num_dimensions, num_chunks, compression_enabled
FROM timescaledb_information.hypertables
ORDER BY hypertable_name;
""",
    "continuous_aggregates.txt": """
SELECT view_name, materialization_hypertable_name, materialized_only, finalized
FROM timescaledb_information.continuous_aggregates
ORDER BY view_name;

SELECT job_id, application_name, schedule_interval, proc_name, scheduled
FROM timescaledb_information.jobs
WHERE application_name ILIKE '%live_sensor%'
   OR proc_name ILIKE '%continuous%'
ORDER BY job_id;
""",
    "event_counts.txt": """
SELECT count(*) AS total_rows,
       min(time) AS first_event,
       max(time) AS last_event,
       count(DISTINCT device_id) AS devices
FROM live_sensor_events;

SELECT device_id, location, count(*) AS rows,
       round(avg(temperature_c)::numeric, 3) AS avg_temp_c,
       round(min(temperature_c)::numeric, 3) AS min_temp_c,
       round(max(temperature_c)::numeric, 3) AS max_temp_c,
       min(time) AS first_event,
       max(time) AS last_event
FROM live_sensor_events
GROUP BY device_id, location
ORDER BY device_id;
""",
    "time_bucket_1min.txt": """
SELECT time_bucket('1 minute', time) AS minute,
       device_id,
       count(*) AS readings,
       round(avg(temperature_c)::numeric, 3) AS avg_temp_c,
       round(min(temperature_c)::numeric, 3) AS min_temp_c,
       round(max(temperature_c)::numeric, 3) AS max_temp_c,
       round(avg(humidity_pct)::numeric, 3) AS avg_humidity_pct
FROM live_sensor_events
GROUP BY minute, device_id
ORDER BY minute, device_id;
""",
    "cagg_10s.txt": """
CALL refresh_continuous_aggregate('live_sensor_stats_10s', NULL, NULL);

SELECT bucket, device_id, location, reading_count,
       round(avg_temp_c::numeric, 3) AS avg_temp_c,
       round(min_temp_c::numeric, 3) AS min_temp_c,
       round(max_temp_c::numeric, 3) AS max_temp_c,
       round(avg_humidity_pct::numeric, 3) AS avg_humidity_pct
FROM live_sensor_stats_10s
ORDER BY bucket, device_id;
""",
    "latest_25.txt": """
SELECT time, device_id, location, temperature_c, humidity_pct, pressure_hpa, battery_v
FROM live_sensor_events
ORDER BY time DESC
LIMIT 25;
""",
    "chunks.txt": """
SELECT hypertable_name, chunk_name, range_start, range_end, is_compressed
FROM timescaledb_information.chunks
WHERE hypertable_name IN ('live_sensor_events')
   OR hypertable_name LIKE '%live_sensor%'
ORDER BY range_start, chunk_name;
""",
}


def run_sql(conn, sql: str) -> str:
    parts = []
    # Split on semicolons but keep CALL / multi statements simple: execute one by one
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    for stmt in statements:
        with conn.cursor() as cur:
            cur.execute(stmt)
            if cur.description is None:
                parts.append(f"-- {stmt.split()[0].upper()} OK (no rows)\n")
                continue
            cols = [d.name for d in cur.description]
            rows = cur.fetchall()
            widths = [len(c) for c in cols]
            str_rows = []
            for row in rows:
                values = []
                for col in cols:
                    val = row[col]
                    text = "" if val is None else str(val)
                    values.append(text)
                str_rows.append(values)
                for i, text in enumerate(values):
                    widths[i] = max(widths[i], len(text))
            header = " | ".join(c.ljust(widths[i]) for i, c in enumerate(cols))
            rule = "-+-".join("-" * widths[i] for i in range(len(cols)))
            body = "\n".join(
                " | ".join(v.ljust(widths[i]) for i, v in enumerate(vals))
                for vals in str_rows
            )
            parts.append(f"{header}\n{rule}\n{body}\n({len(rows)} rows)\n")
    return "\n".join(parts)


def main() -> None:
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    with connect() as conn:
        for name, sql in QUERIES.items():
            result = run_sql(conn, sql)
            path = OUT / name
            path.write_text(
                f"# Query output generated {stamp}\n"
                f"# Database: {service_label()}\n"
                f"# SQL:\n{sql.strip()}\n\n{result}"
            )
            print(f"wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
