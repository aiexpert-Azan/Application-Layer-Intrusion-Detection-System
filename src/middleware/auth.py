from typing import Any, Optional

from fastapi import Header, HTTPException, status

from database.db import get_client_by_api_key


async def verify_api_key(api_key: str) -> dict[str, Any]:
    client = await get_client_by_api_key(api_key)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    if client.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client account is inactive",
        )

    return client


async def get_current_client(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> dict[str, Any]:
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
        )

    return await verify_api_key(x_api_key)