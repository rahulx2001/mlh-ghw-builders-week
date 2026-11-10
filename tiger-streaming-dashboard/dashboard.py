#!/usr/bin/env python3
"""Streamlit live dashboard for live_sensor_events."""

from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
import plotly.express as px
import streamlit as st

from db import connect, service_label

st.set_page_config(
    page_title="Tiger Streaming Analytics",
    page_icon="📡",
    layout="wide",
)

REFRESH_SEC = 5


@st.cache_resource
def get_conn():
    return connect()


def query_df(sql: str, params=None) -> pd.DataFrame:
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        rows = cur.fetchall()
        cols = [d.name for d in cur.description] if cur.description else []
    return pd.DataFrame(rows, columns=cols)


def refresh_cagg() -> None:
    try:
        get_conn().execute(
            "CALL refresh_continuous_aggregate('live_sensor_stats_10s', NULL, NULL)"
        )
    except Exception:
        pass


def load_series() -> pd.DataFrame:
    series = query_df(
        """
        SELECT bucket, device_id, location,
               avg_temp_c, min_temp_c, max_temp_c,
               avg_humidity_pct, reading_count
        FROM live_sensor_stats_10s
        WHERE bucket > now() - interval '10 minutes'
        ORDER BY bucket
        """
    )
    if series.empty:
        series = query_df(
            """
            SELECT
                time_bucket('10 seconds', time) AS bucket,
                device_id,
                location,
                avg(temperature_c) AS avg_temp_c,
                min(temperature_c) AS min_temp_c,
                max(temperature_c) AS max_temp_c,
                avg(humidity_pct)  AS avg_humidity_pct,
                count(*)           AS reading_count
            FROM live_sensor_events
            WHERE time > now() - interval '10 minutes'
            GROUP BY bucket, device_id, location
            ORDER BY bucket
            """
        )
    if not series.empty:
        series["bucket"] = pd.to_datetime(series["bucket"], utc=True)
        for col in ("avg_temp_c", "min_temp_c", "max_temp_c", "avg_humidity_pct"):
            series[col] = pd.to_numeric(series[col], errors="coerce")
    return series


st.title("📡 Real-Time IoT Streaming Analytics")
st.caption(
    f"Tiger Data / TimescaleDB · {service_label()} · "
    "hypertable `live_sensor_events` · continuous aggregate `live_sensor_stats_10s`"
)

auto = st.toggle("Auto-refresh every 5 seconds", value=True)


@st.fragment(run_every=REFRESH_SEC if auto else None)
def live_panel() -> None:
    refresh_cagg()
    now = datetime.now(timezone.utc)
    st.write(f"Last refresh (UTC): **{now.strftime('%Y-%m-%d %H:%M:%S')}**")

    kpi = query_df(
        """
        SELECT
            count(*) FILTER (WHERE time > now() - interval '1 minute')  AS events_1m,
            count(*) FILTER (WHERE time > now() - interval '5 minutes') AS events_5m,
            count(*)                                                    AS events_total,
            count(DISTINCT device_id)
                FILTER (WHERE time > now() - interval '1 minute')       AS devices_1m,
            round(avg(temperature_c)
                FILTER (WHERE time > now() - interval '1 minute')::numeric, 2) AS avg_temp_1m,
            round(avg(humidity_pct)
                FILTER (WHERE time > now() - interval '1 minute')::numeric, 2) AS avg_hum_1m,
            max(time) AS last_event
        FROM live_sensor_events
        """
    )
    row = kpi.iloc[0].to_dict() if not kpi.empty else {}

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Events (1 min)", int(row.get("events_1m") or 0))
    c2.metric("Events (5 min)", int(row.get("events_5m") or 0))
    c3.metric("Devices online (1 min)", int(row.get("devices_1m") or 0))
    avg_temp = row.get("avg_temp_1m")
    c4.metric("Avg temp °C (1 min)", avg_temp if avg_temp is not None else "—")
    c5.metric("Total events", int(row.get("events_total") or 0))
    if row.get("last_event") is not None:
        st.caption(f"Most recent event: {row['last_event']}")

    series = load_series()
    left, right = st.columns(2)
    if not series.empty:
        fig_temp = px.line(
            series,
            x="bucket",
            y="avg_temp_c",
            color="device_id",
            title="Average temperature by device (10s buckets)",
            labels={"bucket": "Time (UTC)", "avg_temp_c": "°C", "device_id": "Device"},
        )
        fig_temp.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02))
        left.plotly_chart(fig_temp, use_container_width=True)

        fig_hum = px.line(
            series,
            x="bucket",
            y="avg_humidity_pct",
            color="device_id",
            title="Average humidity by device (10s buckets)",
            labels={"bucket": "Time (UTC)", "avg_humidity_pct": "%", "device_id": "Device"},
        )
        fig_hum.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02))
        right.plotly_chart(fig_hum, use_container_width=True)
    else:
        st.info("Waiting for the first sensor events… start producer.py")

    st.subheader("Latest readings")
    latest = query_df(
        """
        SELECT time, device_id, location,
               temperature_c, humidity_pct, pressure_hpa, battery_v
        FROM live_sensor_events
        ORDER BY time DESC
        LIMIT 25
        """
    )
    st.dataframe(latest, use_container_width=True, hide_index=True)

    st.subheader("Per-device totals (time_bucket, last 5 minutes)")
    bucketed = query_df(
        """
        SELECT
            time_bucket('1 minute', time) AS minute,
            device_id,
            count(*) AS readings,
            round(avg(temperature_c)::numeric, 2) AS avg_temp_c,
            round(min(temperature_c)::numeric, 2) AS min_temp_c,
            round(max(temperature_c)::numeric, 2) AS max_temp_c
        FROM live_sensor_events
        WHERE time > now() - interval '5 minutes'
        GROUP BY minute, device_id
        ORDER BY minute DESC, device_id
        """
    )
    st.dataframe(bucketed, use_container_width=True, hide_index=True)


live_panel()
