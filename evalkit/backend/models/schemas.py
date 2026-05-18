from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


# --- Test Suites ---

class TestSuiteCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TestSuiteOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    created_at: datetime
    case_count: Optional[int] = 0


# --- Test Cases ---

class TestCaseCreate(BaseModel):
    name: str
    system_prompt: Optional[str] = None
    user_prompt: str
    expected_output: Optional[str] = None
    scoring_method: Optional[str] = "llm_judge"
    rubric: Optional[str] = None
    max_tokens: Optional[int] = 1024


class TestCaseUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None
    expected_output: Optional[str] = None
    scoring_method: Optional[str] = None
    rubric: Optional[str] = None
    max_tokens: Optional[int] = None


class TestCaseOut(BaseModel):
    id: uuid.UUID
    suite_id: uuid.UUID
    name: str
    system_prompt: Optional[str]
    user_prompt: str
    expected_output: Optional[str]
    scoring_method: Optional[str]
    rubric: Optional[str]
    max_tokens: int
    created_at: datetime


# --- Runs ---

class RunCreate(BaseModel):
    suite_id: uuid.UUID
    name: Optional[str] = None
    models: list[str] = Field(min_length=1)


class RunOut(BaseModel):
    id: uuid.UUID
    suite_id: uuid.UUID
    name: Optional[str]
    models: list[str]
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    suite_name: Optional[str] = None
    total_cost: Optional[float] = None
    total_results: Optional[int] = None
    passed_results: Optional[int] = None


# --- Results ---

class ResultOut(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    test_case_id: uuid.UUID
    model: str
    output: Optional[str]
    score: Optional[float]
    passed: Optional[bool]
    hallucination_detected: Optional[bool]
    hallucination_explanation: Optional[str]
    judge_reasoning: Optional[str]
    latency_ms: Optional[int]
    input_tokens: Optional[int]
    output_tokens: Optional[int]
    cost_usd: Optional[float]
    error: Optional[str]
    created_at: datetime


# --- Config ---

class ConfigOut(BaseModel):
    demo: bool
