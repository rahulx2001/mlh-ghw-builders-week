from datetime import datetime, timezone

from producer import DEVICES, initial_states


def test_five_devices_with_unique_ids():
    assert len(DEVICES) == 5
    ids = [d[0] for d in DEVICES]
    assert len(set(ids)) == 5


def test_next_reading_shape_and_ranges():
    states = initial_states()
    now = datetime.now(timezone.utc)
    for state in states:
        row = state.next_reading(now)
        assert row[0] is now
        assert row[1] == state.device_id
        assert row[2] == state.location
        temp, humidity, pressure, battery = row[3], row[4], row[5], row[6]
        assert -5.0 <= temp <= 45.0
        assert 15.0 <= humidity <= 95.0
        assert 980.0 <= pressure <= 1040.0
        assert battery >= 3.2
