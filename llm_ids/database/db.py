from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator, Optional

import aiosqlite

DB_PATH = Path(__file__).with_name("ids.db")

CLIENTS = [
    {"name": "StyleHub AI", "api_key": "sk-shoptalk-001", "plan": "Pro"},
    {"name": "Pizza App", "api_key": "sk-pizza-002", "plan": "Basic"},
    {"name": "HR Software", "api_key": "sk-hr-003", "plan": "Pro"},
    {"name": "Demo Client", "api_key": "sk-demo-004", "plan": "Basic"},
]


def _row_to_dict(row: aiosqlite.Row | None) -> Optional[dict[str, Any]]:
    if row is None:
        return None
    return dict(row)


@asynccontextmanager
async def _get_db() -> AsyncIterator[aiosqlite.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        yield db


async def init_db() -> None:
    async with _get_db() as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                api_key TEXT NOT NULL UNIQUE,
                plan TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active'
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS attack_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                client_name TEXT NOT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                threat_type TEXT NOT NULL,
                query TEXT NOT NULL,
                action TEXT NOT NULL,
                confidence REAL NOT NULL,
                blocked INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
            )
            """
        )
        await db.executemany(
            """
            INSERT OR IGNORE INTO clients (name, api_key, plan, status)
            VALUES (?, ?, ?, 'active')
            """,
            [(client["name"], client["api_key"], client["plan"]) for client in CLIENTS],
        )
        await db.execute("DELETE FROM attack_logs WHERE client_id = 1")
        await db.commit()


async def get_client_by_api_key(api_key: str) -> Optional[dict[str, Any]]:
    async with _get_db() as db:
        cursor = await db.execute(
            """
            SELECT id, name, api_key, plan, status
            FROM clients
            WHERE api_key = ?
            """,
            (api_key,),
        )
        row = await cursor.fetchone()
        await cursor.close()
        return _row_to_dict(row)


async def log_attack(
    client_id: int,
    client_name: str,
    threat_type: str,
    query: str,
    action: str,
    confidence: float,
    blocked: bool,
) -> None:
    async with _get_db() as db:
        await db.execute(
            """
            INSERT INTO attack_logs (
                client_id,
                client_name,
                threat_type,
                query,
                action,
                confidence,
                blocked
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                client_id,
                client_name,
                threat_type,
                query,
                action,
                confidence,
                int(blocked),
            ),
        )
        await db.commit()


async def get_logs_by_client(client_id: int) -> list[dict[str, Any]]:
    async with _get_db() as db:
        cursor = await db.execute(
            """
            SELECT
                id,
                client_id,
                client_name,
                timestamp,
                threat_type,
                query,
                action,
                confidence,
                blocked
            FROM attack_logs
            WHERE client_id = ?
            ORDER BY timestamp DESC, id DESC
            """,
            (client_id,),
        )
        rows = await cursor.fetchall()
        await cursor.close()
        logs: list[dict[str, Any]] = []
        for row in rows:
            log = dict(row)
            log["blocked"] = bool(log["blocked"])
            logs.append(log)
        return logs


async def get_stats_by_client(client_id: int) -> dict[str, Any]:
    async with _get_db() as db:
        cursor = await db.execute(
            """
            SELECT
                COUNT(*) AS total_attacks,
                SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) AS blocked_count
            FROM attack_logs
            WHERE client_id = ?
            """,
            (client_id,),
        )
        summary = await cursor.fetchone()
        await cursor.close()

        cursor = await db.execute(
            """
            SELECT
                COALESCE(threat_type, 'unknown') AS threat_type,
                COUNT(*) AS count
            FROM attack_logs
            WHERE client_id = ?
            GROUP BY COALESCE(threat_type, 'unknown')
            ORDER BY count DESC, threat_type ASC
            """,
            (client_id,),
        )
        threat_rows = await cursor.fetchall()
        await cursor.close()

        cursor = await db.execute(
            """
            SELECT
                date(timestamp) AS day,
                COUNT(*) AS count
            FROM attack_logs
            WHERE client_id = ?
            GROUP BY date(timestamp)
            ORDER BY day ASC
            """,
            (client_id,),
        )
        daily_rows = await cursor.fetchall()
        await cursor.close()

    total_attacks = int(summary["total_attacks"] or 0) if summary else 0
    blocked_count = int(summary["blocked_count"] or 0) if summary else 0

    threat_breakdown = {row["threat_type"]: int(row["count"] or 0) for row in threat_rows}
    daily_attacks = [
        {"day": row["day"], "count": int(row["count"] or 0)}
        for row in daily_rows
    ]

    return {
        "total_attacks": total_attacks,
        "blocked_count": blocked_count,
        "threat_breakdown": threat_breakdown,
        "daily_attacks": daily_attacks,
    }
