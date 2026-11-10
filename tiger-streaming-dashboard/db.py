"""Load database settings from the environment and open psycopg connections."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")


def database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        return url
    host = os.getenv("PGHOST", "127.0.0.1")
    port = os.getenv("PGPORT", "5432")
    user = os.getenv("PGUSER", "tsdbadmin")
    password = os.getenv("PGPASSWORD", "")
    dbname = os.getenv("PGDATABASE", "tsdb")
    sslmode = os.getenv("PGSSLMODE", "require")
    user_q = quote_plus(user)
    password_q = quote_plus(password)
    return (
        f"postgresql://{user_q}:{password_q}@{host}:{port}/{dbname}"
        f"?sslmode={sslmode}"
    )


def connect(*, autocommit: bool = True) -> psycopg.Connection:
    return psycopg.connect(
        database_url(),
        autocommit=autocommit,
        row_factory=dict_row,
        connect_timeout=15,
    )


def service_label() -> str:
    name = os.getenv("TIGER_SERVICE_NAME", "")
    sid = os.getenv("TIGER_SERVICE_ID", "")
    host = os.getenv("PGHOST", "")
    if name and sid:
        return f"{name} ({sid}) @ {host}"
    return host or "configured database"
