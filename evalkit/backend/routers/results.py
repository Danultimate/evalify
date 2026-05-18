from fastapi import APIRouter, Query
from db.database import get_pool
import uuid

router = APIRouter()


@router.get("/runs/{run_id}/results")
async def run_results(run_id: uuid.UUID):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT r.*, tc.name AS test_case_name, tc.expected_output
            FROM results r
            JOIN test_cases tc ON tc.id = r.test_case_id
            WHERE r.run_id = $1
            ORDER BY r.created_at ASC
        """, run_id)
    return [dict(r) for r in rows]


@router.get("/compare")
async def compare_runs(run_ids: list[uuid.UUID] = Query(...)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        placeholders = ", ".join(f"${i+1}" for i in range(len(run_ids)))
        rows = await conn.fetch(
            f"""
            SELECT r.*, tc.name AS test_case_name
            FROM results r
            JOIN test_cases tc ON tc.id = r.test_case_id
            WHERE r.run_id IN ({placeholders})
            ORDER BY r.test_case_id, r.model, r.run_id
            """,
            *run_ids,
        )
    return [dict(r) for r in rows]
