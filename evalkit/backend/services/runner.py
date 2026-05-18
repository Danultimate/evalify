import asyncio
import time
from services.scorer import score_output
from services.cost_tracker import calculate_cost, SUPPORTED_MODELS


async def run_test_case(test_case: dict, model: str) -> dict:
    start = time.time()
    try:
        output, input_tokens, output_tokens = await _call_model(
            model=model,
            system_prompt=test_case.get("system_prompt"),
            user_prompt=test_case["user_prompt"],
            max_tokens=test_case.get("max_tokens", 1024),
        )
        latency_ms = int((time.time() - start) * 1000)

        score, passed, hallucination, hall_exp, reasoning = await score_output(
            output=output,
            expected=test_case.get("expected_output"),
            scoring_method=test_case.get("scoring_method", "llm_judge"),
            rubric=test_case.get("rubric"),
        )

        cost = calculate_cost(model, input_tokens, output_tokens)

        return {
            "output": output,
            "score": score,
            "passed": passed,
            "hallucination_detected": hallucination,
            "hallucination_explanation": hall_exp,
            "judge_reasoning": reasoning,
            "latency_ms": latency_ms,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_usd": cost,
            "error": None,
        }
    except Exception as e:
        return {
            "output": None,
            "score": 0.0,
            "passed": False,
            "hallucination_detected": None,
            "hallucination_explanation": None,
            "judge_reasoning": None,
            "latency_ms": int((time.time() - start) * 1000),
            "input_tokens": 0,
            "output_tokens": 0,
            "cost_usd": 0.0,
            "error": str(e),
        }


async def _call_model(
    model: str,
    system_prompt: str | None,
    user_prompt: str,
    max_tokens: int = 1024,
) -> tuple[str, int, int]:
    if model not in SUPPORTED_MODELS:
        raise ValueError(f"Unsupported model: {model}")

    config = SUPPORTED_MODELS[model]
    system = system_prompt or "You are a helpful assistant."

    if config["provider"] == "anthropic":
        import anthropic
        client = anthropic.AsyncAnthropic()
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return (
            response.content[0].text,
            response.usage.input_tokens,
            response.usage.output_tokens,
        )

    elif config["provider"] == "openai":
        from openai import AsyncOpenAI
        client = AsyncOpenAI()
        response = await client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
        )
        usage = response.usage
        return (
            response.choices[0].message.content,
            usage.prompt_tokens,
            usage.completion_tokens,
        )

    elif config["provider"] == "google":
        import google.generativeai as genai
        model_instance = genai.GenerativeModel(
            model,
            system_instruction=system,
        )
        # Count tokens before generating
        token_count = model_instance.count_tokens(user_prompt)
        input_tokens = token_count.total_tokens

        response = model_instance.generate_content(
            user_prompt,
            generation_config={"max_output_tokens": max_tokens},
        )
        output_text = response.text
        output_token_count = model_instance.count_tokens(output_text)
        output_tokens = output_token_count.total_tokens

        return (output_text, input_tokens, output_tokens)

    raise ValueError(f"Unknown provider for model: {model}")
