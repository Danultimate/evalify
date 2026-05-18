from fastapi import APIRouter, HTTPException
from db.database import get_pool
from models.schemas import TestSuiteCreate, TestSuiteOut, TestCaseCreate, TestCaseUpdate, TestCaseOut
import uuid

router = APIRouter()


@router.get("")
async def list_suites():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT s.*, COUNT(tc.id)::int AS case_count
            FROM test_suites s
            LEFT JOIN test_cases tc ON tc.suite_id = s.id
            GROUP BY s.id
            ORDER BY s.created_at DESC
        """)
    return [dict(r) for r in rows]


@router.post("", response_model=TestSuiteOut)
async def create_suite(body: TestSuiteCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO test_suites (name, description) VALUES ($1, $2) RETURNING *",
            body.name, body.description,
        )
    return {**dict(row), "case_count": 0}


@router.get("/{suite_id}")
async def get_suite(suite_id: uuid.UUID):
    pool = await get_pool()
    async with pool.acquire() as conn:
        suite = await conn.fetchrow("SELECT * FROM test_suites WHERE id = $1", suite_id)
        if not suite:
            raise HTTPException(status_code=404, detail="Suite not found")
        cases = await conn.fetch(
            "SELECT * FROM test_cases WHERE suite_id = $1 ORDER BY created_at ASC",
            suite_id,
        )
    return {**dict(suite), "cases": [dict(c) for c in cases]}


@router.delete("/{suite_id}")
async def delete_suite(suite_id: uuid.UUID):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM test_suites WHERE id = $1", suite_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Suite not found")
    return {"deleted": True}


@router.post("/{suite_id}/cases", response_model=TestCaseOut)
async def add_case(suite_id: uuid.UUID, body: TestCaseCreate):
    pool = await get_pool()
    async with pool.acquire() as conn:
        suite = await conn.fetchrow("SELECT id FROM test_suites WHERE id = $1", suite_id)
        if not suite:
            raise HTTPException(status_code=404, detail="Suite not found")
        row = await conn.fetchrow("""
            INSERT INTO test_cases
              (suite_id, name, system_prompt, user_prompt, expected_output,
               scoring_method, rubric, max_tokens)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
        """, suite_id, body.name, body.system_prompt, body.user_prompt,
            body.expected_output, body.scoring_method, body.rubric, body.max_tokens)
    return dict(row)


@router.put("/cases/{case_id}", response_model=TestCaseOut)
async def update_case(case_id: uuid.UUID, body: TestCaseUpdate):
    pool = await get_pool()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
    values = list(updates.values())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE test_cases SET {set_clause} WHERE id = $1 RETURNING *",
            case_id, *values,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Test case not found")
    return dict(row)


@router.delete("/cases/{case_id}")
async def delete_case(case_id: uuid.UUID):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM test_cases WHERE id = $1", case_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Test case not found")
    return {"deleted": True}


@router.get("/{suite_id}/runs")
async def suite_runs(suite_id: uuid.UUID):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM runs WHERE suite_id = $1 ORDER BY created_at DESC",
            suite_id,
        )
    return [dict(r) for r in rows]
