import asyncio
import json
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from db.database import get_pool
from models.schemas import RunCreate, RunOut
from services.runner import run_test_case
from services.cost_tracker import SUPPORTED_MODELS

router = APIRouter()


@router.post("", response_model=RunOut)
async def create_run(body: RunCreate):
    for model in body.models:
        if model not in SUPPORTED_MODELS:
            raise HTTPException(status_code=400, detail=f"Unsupported model: {model}")

    pool = await get_pool()
    async with pool.acquire() as conn:
        suite = await conn.fetchrow("SELECT id FROM test_suites WHERE id = $1", body.suite_id)
        if not suite:
            raise HTTPException(status_code=404, detail="Suite not found")

        run = await conn.fetchrow("""
            INSERT INTO runs (suite_id, name, models, status, started_at)
            VALUES ($1, $2, $3, 'running', NOW())
            RETURNING *
        """, body.suite_id, body.name, body.models)

        cases = await conn.fetch(
            "SELECT * FROM test_cases WHERE suite_id = $1",
            body.suite_id,
        )

    run_id = run["id"]
    asyncio.create_task(_execute_run(run_id, [dict(c) for c in cases], body.models))

    return dict(run)


@router.get("", response_model=list[RunOut])
async def list_runs():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT
                r.*,
                ts.name AS suite_name,
                COALESCE(SUM(res.cost_usd), 0)::float AS total_cost,
                COUNT(res.id)::int AS total_results,
                COUNT(res.id) FILTER (WHERE res.passed = true)::int AS passed_results
            FROM runs r
            LEFT JOIN test_suites ts ON ts.id = r.suite_id
            LEFT JOIN results res ON res.run_id = r.id
            GROUP BY r.id, ts.name
            ORDER BY r.started_at DESC
            LIMIT 50
        """)
    return [dict(r) for r in rows]


@router.get("/{run_id}", response_model=RunOut)
async def get_run(run_id: uuid.UUID):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM runs WHERE id = $1", run_id)
        if not row:
            raise HTTPException(status_code=404, detail="Run not found")
    return dict(row)


@router.get("/{run_id}/stream")
async def stream_run(run_id: uuid.UUID):
    pool = await get_pool()
    async with pool.acquire() as conn:
        run = await conn.fetchrow("SELECT * FROM runs WHERE id = $1", run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")

    async def event_generator():
        seen_ids: set[str] = set()
        while True:
            async with pool.acquire() as conn:
                run_row = await conn.fetchrow("SELECT status FROM runs WHERE id = $1", run_id)
                results = await conn.fetch("""
                    SELECT r.*, tc.name AS test_case_name, tc.expected_output
                    FROM results r
                    JOIN test_cases tc ON tc.id = r.test_case_id
                    WHERE r.run_id = $1
                    ORDER BY r.created_at ASC
                """, run_id)

            for result in results:
                rid = str(result["id"])
                if rid not in seen_ids:
                    seen_ids.add(rid)
                    yield {
                        "event": "result",
                        "data": json.dumps({
                            "type": "result",
                            "test_case_id": str(result["test_case_id"]),
                            "model": result["model"],
                            "data": _serialize_result(dict(result)),
                        }),
                    }

            if run_row["status"] in ("complete", "failed"):
                yield {
                    "event": "complete",
                    "data": json.dumps({"type": "complete", "run_id": str(run_id)}),
                }
                break

            await asyncio.sleep(1)

    return EventSourceResponse(event_generator())


async def _execute_run(run_id: uuid.UUID, cases: list[dict], models: list[str]):
    pool = await get_pool()
    try:
        tasks = [
            _run_single(pool, run_id, case, model)
            for case in cases
            for model in models
        ]
        await asyncio.gather(*tasks)

        async with pool.acquire() as conn:
            await conn.execute("""
                UPDATE runs SET status = 'complete', completed_at = NOW() WHERE id = $1
            """, run_id)
    except Exception:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE runs SET status = 'failed', completed_at = NOW() WHERE id = $1",
                run_id,
            )


async def _run_single(pool, run_id: uuid.UUID, case: dict, model: str):
    result = await run_test_case(case, model)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            INSERT INTO results
              (run_id, test_case_id, model, output, score, passed,
               hallucination_detected, hallucination_explanation, judge_reasoning,
               latency_ms, input_tokens, output_tokens, cost_usd, error)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *
        """,
            run_id, case["id"], model,
            result["output"], result["score"], result["passed"],
            result["hallucination_detected"], result["hallucination_explanation"],
            result["judge_reasoning"], result["latency_ms"],
            result["input_tokens"], result["output_tokens"],
            result["cost_usd"], result["error"],
        )
    serialized = _serialize_result(dict(row))
    serialized["test_case_name"] = case.get("name")
    serialized["expected_output"] = case.get("expected_output")
    return serialized


def _serialize_result(r: dict) -> dict:
    return {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in r.items()
            if not isinstance(v, datetime)}
