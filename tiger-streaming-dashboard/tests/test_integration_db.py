
"""Integration checks against the configured TimescaleDB (requires .env)."""

from db import connect


def test_extension_hypertable_and_caggs_exist():
    with connect() as conn:
        ext = conn.execute(
            "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'"
        ).fetchone()
        assert ext and ext["extversion"]
        ht = conn.execute(
            """
            SELECT hypertable_name FROM timescaledb_information.hypertables
            WHERE hypertable_name = 'live_sensor_events'
            """
        ).fetchone()
        assert ht is not None
        caggs = {
            r["view_name"]
            for r in conn.execute(
                """
                SELECT view_name FROM timescaledb_information.continuous_aggregates
                WHERE view_name IN ('live_sensor_stats_10s', 'live_sensor_stats_1min')
                """
            ).fetchall()
        }
        assert caggs == {"live_sensor_stats_10s", "live_sensor_stats_1min"}


def test_can_insert_and_time_bucket():
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO live_sensor_events
                (time, device_id, location, temperature_c, humidity_pct, pressure_hpa, battery_v)
            VALUES (now(), 'sensor-test', 'test', 21.25, 40.5, 1013.2, 4.01)
            """
        )
        row = conn.execute(
            """
            SELECT count(*) AS n,
                   round(avg(temperature_c)::numeric, 2) AS avg_temp
            FROM live_sensor_events
            WHERE device_id = 'sensor-test'
            """
        ).fetchone()
        assert row["n"] >= 1
        assert row["avg_temp"] is not None
        conn.execute("DELETE FROM live_sensor_events WHERE device_id = 'sensor-test'")
