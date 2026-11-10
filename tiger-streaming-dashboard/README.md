# Real-Time Streaming Analytics (Tiger Data)

MLH Global Hack Week: Builders Week — **Challenge 4: Build a Real-Time Streaming Analytics App**.

A Python producer streams simulated IoT sensor pings into a TimescaleDB **hypertable** (`live_sensor_events`). Two **continuous aggregates** (`live_sensor_stats_10s`, `live_sensor_stats_1min`) roll the feed up with `time_bucket`, and a **Streamlit** dashboard auto-refreshes to show live KPIs and charts.

The existing `sensor_data` hypertable on the Tiger Cloud service is left untouched.

## Target database

The intended production target is Tiger Cloud service **db-73589** (id `xvtct51t58`):

```
xvtct51t58.drl2pcauup.tsdb.cloud.timescale.com:37499/tsdb
```

Copy `.env.example` to `.env` and set `PGPASSWORD` (or `DATABASE_URL`) from a local `tiger` CLI or the Tiger Cloud console. Never commit `.env`.

```bash
tiger db uri --service-id xvtct51t58 --with-password
# or: tiger service get xvtct51t58 --with-password
```

To try the same schema locally, run TimescaleDB and point `.env` at it:

```bash
docker run -d --name tiger-streaming-local \
  -e POSTGRES_USER=tsdbadmin \
  -e POSTGRES_PASSWORD=choose-a-password \
  -e POSTGRES_DB=tsdb \
  -p 127.0.0.1:55432:5432 \
  timescale/timescaledb:2.21.3-pg17
```

Then set `PGHOST=127.0.0.1`, `PGPORT=55432`, `PGSSLMODE=disable`, and the same user/password/database.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python setup_schema.py
```

`setup_schema.py` applies `sql/001_schema.sql`: enables TimescaleDB, creates the hypertable, and adds the 10-second and 1-minute continuous aggregates plus refresh policies.

## Run

Terminal 1 — stream events (one row per device, default every 0.4s):

```bash
source .venv/bin/activate
python producer.py
```

Optional: `python producer.py --duration 180` to stop after three minutes.

Terminal 2 — dashboard:

```bash
source .venv/bin/activate
streamlit run dashboard.py --server.port 8501 --server.headless true
```

Open [http://localhost:8501](http://localhost:8501). Auto-refresh is on by default (every 5 seconds). You should see event counts, online devices, temperature and humidity charts from the 10-second continuous aggregate (falling back to a raw `time_bucket` query if the aggregate has not caught up), the latest 25 rows, and a 1-minute `time_bucket` table.

## Export query output

After the producer has been running for a minute or more:

```bash
python export_reports.py
```

Exact query results are written under `reports/`.

## Tests

```bash
python -m pytest -q
```

## Layout

- `producer.py` — simulated IoT devices (lobby, lab, rooftop, server-room, warehouse)
- `dashboard.py` — Streamlit live view
- `sql/001_schema.sql` — hypertable + continuous aggregates
- `reports/` — saved SQL output from a real run
