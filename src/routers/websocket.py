from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect


router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, client_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[client_id].append(websocket)

    def disconnect(self, client_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.get(client_id)
        if not connections:
            return

        if websocket in connections:
            connections.remove(websocket)

        if not connections:
            self.active_connections.pop(client_id, None)

    async def broadcast_to_client(self, client_id: str, message: dict[str, Any]) -> None:
        connections = list(self.active_connections.get(client_id, []))
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(client_id, websocket)


manager = ConnectionManager()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str) -> None:
    await manager.connect(client_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id, websocket)


async def broadcast_attack(client_id: str, attack_data: dict[str, Any]) -> None:
    payload = {
        "timestamp": attack_data.get(
            "timestamp",
            datetime.now(timezone.utc).isoformat(),
        ),
        "threat_type": attack_data.get("threat_type", "UNKNOWN"),
        "query": attack_data.get("query", ""),
        "action": attack_data.get("action", "BLOCKED"),
        "confidence": attack_data.get("confidence", 0.0),
        "client_name": attack_data.get("client_name", ""),
    }
    await manager.broadcast_to_client(str(client_id), payload)