#!/usr/bin/env python3
"""Stream simulated IoT sensor events into live_sensor_events."""

from __future__ import annotations

import argparse
import math
import os
import random
import signal
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from db import connect

DEVICES = [
    ("sensor-lobby", "lobby"),
    ("sensor-lab", "lab"),
    ("sensor-roof", "rooftop"),
    ("sensor-server", "server-room"),
    ("sensor-warehouse", "warehouse"),
]


@dataclass
class DeviceState:
    device_id: str
    location: str
    temp: float
    humidity: float
    pressure: float
    battery: float
    phase: float

    def next_reading(self, now: datetime) -> tuple:
        self.phase += 0.08 + random.uniform(-0.02, 0.02)
        # Slow diurnal-ish drift plus noise.
        drift = 1.4 * math.sin(self.phase)
        self.temp = max(-5.0, min(45.0, self.temp + drift * 0.15 + random.gauss(0, 0.12)))
        self.humidity = max(15.0, min(95.0, self.humidity + random.gauss(0, 0.35)))
        self.pressure = max(980.0, min(1040.0, self.pressure + random.gauss(0, 0.08)))
        self.battery = max(3.20, self.battery - random.uniform(0.00002, 0.00008))
        return (
            now,
            self.device_id,
            self.location,
            round(self.temp, 3),
            round(self.humidity, 3),
            round(self.pressure, 3),
            round(self.battery, 4),
        )


def initial_states() -> list[DeviceState]:
    bases = {
        "lobby": (22.0, 45.0, 1013.0, 4.05),
        "lab": (20.5, 40.0, 1012.5, 4.10),
        "rooftop": (16.0, 55.0, 1008.0, 3.95),
        "server-room": (24.5, 35.0, 1014.0, 4.12),
        "warehouse": (18.5, 60.0, 1011.0, 4.00),
    }
    states = []
    for device_id, location in DEVICES:
        t, h, p, b = bases[location]
        states.append(
            DeviceState(
                device_id=device_id,
                location=location,
                temp=t + random.uniform(-0.4, 0.4),
                humidity=h + random.uniform(-2, 2),
                pressure=p + random.uniform(-0.5, 0.5),
                battery=b,
                phase=random.uniform(0, math.tau),
            )
        )
    return states


INSERT_SQL = """
INSERT INTO live_sensor_events
    (time, device_id, location, temperature_c, humidity_pct, pressure_hpa, battery_v)
VALUES (%s, %s, %s, %s, %s, %s, %s)
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--interval",
        type=float,
        default=float(os.getenv("PRODUCER_INTERVAL_SEC", "0.4")),
        help="Seconds between batches (one row per device).",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=0.0,
        help="Stop after this many seconds (0 = run until SIGINT).",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Insert a single batch and exit.",
    )
    args = parser.parse_args()

    stop = {"flag": False}

    def _handle(signum, _frame):
        stop["flag"] = True

    signal.signal(signal.SIGINT, _handle)
    signal.signal(signal.SIGTERM, _handle)

    states = initial_states()
    started = time.monotonic()
    inserted = 0
    batches = 0

    with connect() as conn:
        print(
            f"producer started: {len(states)} devices, interval={args.interval}s",
            flush=True,
        )
        while not stop["flag"]:
            now = datetime.now(timezone.utc)
            rows = [state.next_reading(now) for state in states]
            with conn.cursor() as cur:
                cur.executemany(INSERT_SQL, rows)
            inserted += len(rows)
            batches += 1
            if batches % 10 == 0:
                print(
                    f"{now.isoformat()} batches={batches} rows={inserted}",
                    flush=True,
                )
            if args.once:
                break
            if args.duration and (time.monotonic() - started) >= args.duration:
                break
            time.sleep(max(0.05, args.interval))

    print(f"producer stopped: batches={batches} rows={inserted}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
