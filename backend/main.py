import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import get_pool, close_pool
from db.migrations import run_migrations
from routers import test_suites, runs, results, models


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    await run_migrations()
    yield
    await close_pool()


app = FastAPI(title="EvalKit API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test_suites.router, prefix="/api/suites")
app.include_router(runs.router, prefix="/api/runs")
app.include_router(results.router, prefix="/api")
app.include_router(models.router, prefix="/api/models")


@app.get("/api/config")
async def get_config():
    return {"demo": os.environ.get("DEMO_MODE", "false").lower() == "true"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
