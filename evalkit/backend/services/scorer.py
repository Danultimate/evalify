import numpy as np
from services.judge import llm_judge


async def score_output(
    output: str,
    expected: str | None,
    scoring_method: str,
    rubric: str | None = None,
) -> tuple[float, bool, bool, str | None, str | None]:
    """
    Returns (score, passed, hallucination_detected, hallucination_explanation, reasoning)
    """
    if scoring_method == "exact":
        if not expected:
            return (0.0, False, False, None, "No expected output set for exact match.")
        passed = output.strip().lower() == expected.strip().lower()
        return (1.0 if passed else 0.0, passed, False, None, None)

    elif scoring_method == "semantic":
        if not expected:
            return (0.0, False, False, None, "No expected output set for semantic scoring.")
        score = await _semantic_similarity(output, expected)
        return (score, score >= 0.85, False, None, f"Cosine similarity: {score:.3f}")

    elif scoring_method in ("llm_judge", "rubric"):
        return await llm_judge(output, expected, rubric, scoring_method)

    return (0.0, False, False, None, f"Unknown scoring method: {scoring_method}")


async def _semantic_similarity(text1: str, text2: str) -> float:
    try:
        import voyageai
        client = voyageai.Client()
        result = client.embed([text1, text2], model="voyage-3")
        e1, e2 = result.embeddings
        e1, e2 = np.array(e1), np.array(e2)
        return float(np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2)))
    except Exception:
        # Fall back to llm_judge if Voyage unavailable
        score, passed, hall, hall_exp, reasoning = await llm_judge(
            text1, text2, None, "llm_judge"
        )
        return score
