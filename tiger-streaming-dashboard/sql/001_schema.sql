-- Live IoT sensor stream for the MLH Tiger Data streaming challenge.
-- Does not modify the existing sensor_data hypertable.

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS live_sensor_events (
    time            TIMESTAMPTZ       NOT NULL,
    device_id       TEXT              NOT NULL,
    location        TEXT              NOT NULL,
    temperature_c   DOUBLE PRECISION  NOT NULL,
    humidity_pct    DOUBLE PRECISION  NOT NULL,
    pressure_hpa    DOUBLE PRECISION  NOT NULL,
    battery_v       DOUBLE PRECISION  NOT NULL
);

SELECT create_hypertable(
    'live_sensor_events',
    'time',
    if_not_exists => TRUE,
    migrate_data => TRUE
);

CREATE INDEX IF NOT EXISTS live_sensor_events_device_time_idx
    ON live_sensor_events (device_id, time DESC);

CREATE INDEX IF NOT EXISTS live_sensor_events_location_time_idx
    ON live_sensor_events (location, time DESC);

-- 10-second continuous aggregate for the live dashboard.
CREATE MATERIALIZED VIEW IF NOT EXISTS live_sensor_stats_10s
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('10 seconds', time) AS bucket,
    device_id,
    location,
    count(*)                        AS reading_count,
    avg(temperature_c)              AS avg_temp_c,
    min(temperature_c)              AS min_temp_c,
    max(temperature_c)              AS max_temp_c,
    avg(humidity_pct)               AS avg_humidity_pct,
    avg(pressure_hpa)               AS avg_pressure_hpa,
    avg(battery_v)                  AS avg_battery_v
FROM live_sensor_events
GROUP BY bucket, device_id, location
WITH NO DATA;

-- Refresh frequently so the dashboard stays close to real time.
SELECT add_continuous_aggregate_policy(
    'live_sensor_stats_10s',
    start_offset => INTERVAL '1 hour',
    end_offset   => INTERVAL '10 seconds',
    schedule_interval => INTERVAL '10 seconds',
    if_not_exists => TRUE
);

-- 1-minute rollup for slightly longer trends.
CREATE MATERIALIZED VIEW IF NOT EXISTS live_sensor_stats_1min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', time) AS bucket,
    device_id,
    location,
    count(*)                      AS reading_count,
    avg(temperature_c)            AS avg_temp_c,
    min(temperature_c)            AS min_temp_c,
    max(temperature_c)            AS max_temp_c,
    avg(humidity_pct)             AS avg_humidity_pct,
    avg(pressure_hpa)             AS avg_pressure_hpa
FROM live_sensor_events
GROUP BY bucket, device_id, location
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
    'live_sensor_stats_1min',
    start_offset => INTERVAL '6 hours',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE
);
