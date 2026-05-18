import json
import anthropic

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic()
    return _client


async def llm_judge(
    output: str,
    expected: str | None,
    rubric: str | None,
    mode: str,
) -> tuple[float, bool, bool, str | None, str | None]:
    """
    Returns (score, passed, hallucination_detected, hallucination_explanation, reasoning)
    """
    if mode == "llm_judge":
        prompt = f"""You are an impartial evaluator. Score the AI output against the expected output.

Expected output:
{expected or '(none provided)'}

Actual output:
{output}

Evaluate:
1. Factual accuracy (does it hallucinate relative to the expected output?)
2. Completeness (does it cover the key points?)
3. Quality (is it well-formed and useful?)

Respond ONLY with valid JSON, no markdown:
{{
  "score": <float 0.0 to 1.0>,
  "passed": <true if score >= 0.7>,
  "hallucination_detected": <true if output contains facts not in expected>,
  "hallucination_explanation": "<what was hallucinated, or null>",
  "reasoning": "<2-3 sentence explanation of the score>"
}}"""

    else:  # rubric
        prompt = f"""You are an impartial evaluator. Score the AI output against this rubric:

Rubric:
{rubric or '(none provided)'}

Actual output:
{output}

Respond ONLY with valid JSON, no markdown:
{{
  "score": <float 0.0 to 1.0>,
  "passed": <true if score >= 0.7>,
  "hallucination_detected": false,
  "hallucination_explanation": null,
  "reasoning": "<2-3 sentence explanation referencing specific rubric criteria>"
}}"""

    client = _get_client()
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    # Strip markdown code fences if Claude wraps anyway
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    result = json.loads(text)
    return (
        float(result["score"]),
        bool(result["passed"]),
        bool(result.get("hallucination_detected", False)),
        result.get("hallucination_explanation"),
        result.get("reasoning"),
    )
