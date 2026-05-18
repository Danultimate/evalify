PRICING: dict[str, dict[str, float]] = {
    "claude-sonnet-4-20250514": {"input": 0.003, "output": 0.015},
    "claude-haiku-4-20250514":  {"input": 0.00025, "output": 0.00125},
    "gpt-4o":                   {"input": 0.005, "output": 0.015},
    "gpt-4o-mini":              {"input": 0.00015, "output": 0.0006},
    "gemini-1.5-pro":           {"input": 0.00125, "output": 0.005},
    "gemini-1.5-flash":         {"input": 0.000075, "output": 0.0003},
}

SUPPORTED_MODELS: dict[str, dict] = {
    "claude-sonnet-4-20250514": {"provider": "anthropic", "label": "Claude Sonnet 4"},
    "claude-haiku-4-20250514":  {"provider": "anthropic", "label": "Claude Haiku 4"},
    "gpt-4o":                   {"provider": "openai",    "label": "GPT-4o"},
    "gpt-4o-mini":              {"provider": "openai",    "label": "GPT-4o Mini"},
    "gemini-1.5-pro":           {"provider": "google",    "label": "Gemini 1.5 Pro"},
    "gemini-1.5-flash":         {"provider": "google",    "label": "Gemini 1.5 Flash"},
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    if model not in PRICING:
        return 0.0
    p = PRICING[model]
    return round(
        (input_tokens / 1000 * p["input"]) + (output_tokens / 1000 * p["output"]),
        6,
    )
