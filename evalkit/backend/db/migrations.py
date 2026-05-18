from db.database import get_pool

SCHEMA = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    system_prompt TEXT,
    user_prompt TEXT NOT NULL,
    expected_output TEXT,
    scoring_method VARCHAR(50),
    rubric TEXT,
    max_tokens INTEGER DEFAULT 1024,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID REFERENCES test_suites(id),
    name VARCHAR(255),
    models TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id),
    model VARCHAR(100) NOT NULL,
    output TEXT,
    score FLOAT,
    passed BOOLEAN,
    hallucination_detected BOOLEAN,
    hallucination_explanation TEXT,
    judge_reasoning TEXT,
    latency_ms INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd FLOAT,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
"""


async def run_migrations():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA)
