import sys
import os
sys.path.insert(0, os.path.dirname(
    os.path.abspath(__file__)
))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import uvicorn

from database.db import init_db
from routers.query import router as query_router
from routers.websocket import router as websocket_router

print(f"Starting SecureIDS on port: {os.environ.get('PORT', 8000)}")
print(f"Groq API Key present: {bool(os.environ.get('GROQ_API_KEY'))}")


app = FastAPI(
	title="LLM-IDS Security Gateway",
	description="Application Layer IDS for Multi-Tenant SaaS",
	version="1.0.0",
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=[
		"http://localhost:5173",
		"http://localhost:3000",
		"https://*.vercel.app",
		"*"
	],
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
	await init_db()


@app.get("/health")
async def health_check() -> dict[str, str]:
	return {"status": "running", "version": "1.0.0"}


app.include_router(query_router, prefix="/api")
app.include_router(websocket_router)


if __name__ == "__main__":
	uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=False)
