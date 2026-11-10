from pathlib import Path

SQL = (Path(__file__).resolve().parents[1] / "sql" / "001_schema.sql").read_text()


def test_schema_creates_hypertable_and_caggs():
    assert "create_hypertable" in SQL
    assert "live_sensor_events" in SQL
    assert "timescaledb.continuous" in SQL
    assert "live_sensor_stats_10s" in SQL
    assert "live_sensor_stats_1min" in SQL
    assert "add_continuous_aggregate_policy" in SQL
    # Do not mutate the pre-existing sensor_data hypertable.
    lowered = SQL.lower()
    for verb in ("drop ", "alter ", "truncate ", "insert into "):
        assert f"{verb}sensor_data" not in lowered
