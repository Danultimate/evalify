"""
Seed script — idempotent. Safe to run multiple times.
Run: python seed.py
"""
import asyncio
import asyncpg
import os
import uuid
from datetime import datetime, timedelta
import random

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://evalkit:evalkit@localhost:5432/evalkit")


async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    existing = await conn.fetchval("SELECT COUNT(*) FROM runs")
    if existing > 0:
        print(f"Seed data already present ({existing} runs). Skipping.")
        await conn.close()
        return

    print("Seeding database...")

    # ------------------------------------------------------------------ #
    # SUITE 1: Customer Support
    # ------------------------------------------------------------------ #
    suite1_id = await conn.fetchval("""
        INSERT INTO test_suites (name, description)
        VALUES ($1, $2) RETURNING id
    """, "Customer Support", "Evaluating AI responses for support ticket workflows")

    cs_cases = [
        {
            "name": "Classify complaint severity",
            "system_prompt": "You are a support triage assistant. Respond with only: low, medium, or high.",
            "user_prompt": "A customer is threatening to cancel their $50k annual contract unless their billing issue is resolved today.",
            "expected_output": "high",
            "scoring_method": "exact",
            "rubric": None,
        },
        {
            "name": "Draft refund apology email",
            "system_prompt": "You are a customer success manager. Write empathetic, professional emails.",
            "user_prompt": "Write a short apology email to a customer who was incorrectly charged twice for their subscription. Include next steps.",
            "expected_output": None,
            "scoring_method": "rubric",
            "rubric": "The response must be: (1) empathetic and apologetic in tone, (2) under 150 words, (3) include a concrete next step such as refund timeline, (4) professional and not overly formal",
        },
        {
            "name": "Summarize support ticket",
            "system_prompt": "You are a support analyst. Summarize tickets in 2 sentences maximum.",
            "user_prompt": "Ticket: Customer reports that since the v2.3 update last Tuesday, the export to PDF feature crashes the app on iOS 17. They've tried reinstalling. This is blocking their end-of-month reporting. Priority: High.",
            "expected_output": "Customer's PDF export feature crashes on iOS 17 after the v2.3 update. Reinstallation did not resolve the issue, blocking end-of-month reporting.",
            "scoring_method": "llm_judge",
            "rubric": None,
        },
        {
            "name": "Detect frustrated customer tone",
            "system_prompt": "Analyze the customer message. Respond with only: true or false.",
            "user_prompt": "Is this customer frustrated? Message: 'I've contacted support THREE times about this. Nobody fixes anything. This is completely unacceptable.'",
            "expected_output": "true",
            "scoring_method": "exact",
            "rubric": None,
        },
    ]

    cs_case_ids = []
    for c in cs_cases:
        cid = await conn.fetchval("""
            INSERT INTO test_cases (suite_id, name, system_prompt, user_prompt, expected_output, scoring_method, rubric)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
        """, suite1_id, c["name"], c["system_prompt"], c["user_prompt"],
            c["expected_output"], c["scoring_method"], c["rubric"])
        cs_case_ids.append(cid)

    # ------------------------------------------------------------------ #
    # SUITE 2: Code Generation
    # ------------------------------------------------------------------ #
    suite2_id = await conn.fetchval("""
        INSERT INTO test_suites (name, description)
        VALUES ($1, $2) RETURNING id
    """, "Code Generation", "Testing AI code generation quality across common engineering tasks")

    code_cases = [
        {
            "name": "Python binary search implementation",
            "system_prompt": "You are an expert Python engineer. Write clean, documented code.",
            "user_prompt": "Write a Python function that performs binary search on a sorted list. Include a docstring and handle edge cases.",
            "expected_output": "A correct binary search implementation with O(log n) complexity, docstring, and edge case handling for empty list and target not found.",
            "scoring_method": "llm_judge",
            "rubric": None,
        },
        {
            "name": "Explain stack overflow error",
            "system_prompt": "You are a senior engineer explaining errors to a junior developer. Be clear, avoid jargon, and be actionable.",
            "user_prompt": "Explain this error and how to fix it: 'RecursionError: maximum recursion depth exceeded while calling a Python object'",
            "expected_output": None,
            "scoring_method": "rubric",
            "rubric": "Response must: (1) explain what recursion is in plain terms, (2) explain why the limit exists, (3) provide at least one concrete fix, (4) avoid excessive technical jargon",
        },
        {
            "name": "Convert SQL to Pandas",
            "system_prompt": "You are a data engineer. Convert SQL queries to pandas code accurately.",
            "user_prompt": "Convert this SQL to pandas: SELECT customer_id, SUM(order_total) as total_spent FROM orders WHERE status = 'completed' GROUP BY customer_id ORDER BY total_spent DESC LIMIT 10",
            "expected_output": "df[df['status'] == 'completed'].groupby('customer_id')['order_total'].sum().reset_index(name='total_spent').sort_values('total_spent', ascending=False).head(10)",
            "scoring_method": "semantic",
            "rubric": None,
        },
        {
            "name": "Fix broken React useEffect",
            "system_prompt": "You are a React expert. Identify and fix bugs clearly.",
            "user_prompt": "Fix this React component — it causes an infinite loop:\n\n```jsx\nfunction UserProfile({ userId }) {\n  const [user, setUser] = useState(null);\n  useEffect(() => {\n    fetch(`/api/users/${userId}`)\n      .then(r => r.json())\n      .then(setUser);\n  }, [user]);\n  return <div>{user?.name}</div>;\n}\n```",
            "expected_output": "The dependency array should use [userId] instead of [user]. Using [user] causes the effect to re-run every time user state changes, creating an infinite loop.",
            "scoring_method": "llm_judge",
            "rubric": None,
        },
    ]

    code_case_ids = []
    for c in code_cases:
        cid = await conn.fetchval("""
            INSERT INTO test_cases (suite_id, name, system_prompt, user_prompt, expected_output, scoring_method, rubric)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
        """, suite2_id, c["name"], c["system_prompt"], c["user_prompt"],
            c["expected_output"], c["scoring_method"], c["rubric"])
        code_case_ids.append(cid)

    # ------------------------------------------------------------------ #
    # SUITE 3: Content
    # ------------------------------------------------------------------ #
    suite3_id = await conn.fetchval("""
        INSERT INTO test_suites (name, description)
        VALUES ($1, $2) RETURNING id
    """, "Content & Copy", "Evaluating AI writing quality for marketing and editorial use cases")

    content_cases = [
        {
            "name": "LinkedIn hook for AI post",
            "system_prompt": "You are a B2B content strategist. Write punchy, scroll-stopping hooks.",
            "user_prompt": "Write an opening hook (first line only) for a LinkedIn post about how most engineers don't know how to evaluate AI outputs properly.",
            "expected_output": None,
            "scoring_method": "rubric",
            "rubric": "The hook must: (1) be under 20 words, (2) create curiosity or tension, (3) be specific to engineers or AI, (4) avoid clichés like 'In today's world' or 'Game changer'",
        },
        {
            "name": "Blog post summarization",
            "system_prompt": "You are a technical editor. Summarize content accurately and concisely.",
            "user_prompt": "Summarize this in 3 bullet points:\n\nLLM evaluation is the practice of systematically measuring AI model outputs against defined criteria. Without it, teams rely on vibes — manually checking a few outputs and assuming quality at scale. Good evals use a mix of scoring methods: exact match for deterministic outputs, semantic similarity for paraphrase-tolerant cases, and LLM-as-judge for subjective quality. The key insight is that evaluation should be automated, repeatable, and tied to your actual use case — not a generic benchmark.",
            "expected_output": "LLM evaluation measures AI outputs systematically. Methods include exact match, semantic similarity, and LLM-as-judge. Good evals are automated, repeatable, and use-case specific.",
            "scoring_method": "semantic",
            "rubric": None,
        },
        {
            "name": "Rewrite in formal tone",
            "system_prompt": "You are a copy editor. Rewrite text in a formal register while preserving all meaning.",
            "user_prompt": "Rewrite this formally: 'Our AI thing basically checks if your prompts are working right or totally bombing. Super useful for devs who wanna make sure their AI stuff doesn't break in prod.'",
            "expected_output": "EvalKit systematically assesses prompt performance and reliability, providing developers with the tools necessary to ensure AI integrations function correctly in production environments.",
            "scoring_method": "llm_judge",
            "rubric": None,
        },
    ]

    content_case_ids = []
    for c in content_cases:
        cid = await conn.fetchval("""
            INSERT INTO test_cases (suite_id, name, system_prompt, user_prompt, expected_output, scoring_method, rubric)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
        """, suite3_id, c["name"], c["system_prompt"], c["user_prompt"],
            c["expected_output"], c["scoring_method"], c["rubric"])
        content_case_ids.append(cid)

    # ------------------------------------------------------------------ #
    # PRE-SEEDED RUNS & RESULTS
    # ------------------------------------------------------------------ #

    MODELS = ["claude-sonnet-4-20250514", "gpt-4o", "gemini-1.5-pro"]

    # Run 1 — Customer Support (older baseline)
    run1_id = await conn.fetchval("""
        INSERT INTO runs (suite_id, name, models, status, started_at, completed_at)
        VALUES ($1, $2, $3, 'complete', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '45 seconds')
        RETURNING id
    """, suite1_id, "Baseline — Customer Support v1", MODELS)

    # Run 2 — Customer Support (newer, slight regression on one case)
    run2_id = await conn.fetchval("""
        INSERT INTO runs (suite_id, name, models, status, started_at, completed_at)
        VALUES ($1, $2, $3, 'complete', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '38 seconds')
        RETURNING id
    """, suite1_id, "After prompt update — Customer Support v2", MODELS)

    # Run 3 — Code Generation
    run3_id = await conn.fetchval("""
        INSERT INTO runs (suite_id, name, models, status, started_at, completed_at)
        VALUES ($1, $2, $3, 'complete', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours' + INTERVAL '52 seconds')
        RETURNING id
    """, suite2_id, "Code Gen Benchmark", MODELS)

    # Run 4 — Content
    run4_id = await conn.fetchval("""
        INSERT INTO runs (suite_id, name, models, status, started_at, completed_at)
        VALUES ($1, $2, $3, 'complete', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '41 seconds')
        RETURNING id
    """, suite3_id, "Content Quality Eval", MODELS)

    # ------------------------------------------------------------------ #
    # Result data: realistic scores per model per case
    # ------------------------------------------------------------------ #
    results_data = []

    # --- Run 1: CS baseline ---
    cs_scores_run1 = {
        "claude-sonnet-4-20250514": [1.0, 0.91, 0.88, 1.0],
        "gpt-4o":                   [1.0, 0.84, 0.79, 1.0],
        "gemini-1.5-pro":           [0.0, 0.76, 0.72, 1.0],  # hallucination on case 1
    }
    cs_outputs_run1 = {
        "claude-sonnet-4-20250514": [
            "high",
            "Dear [Customer Name],\n\nWe sincerely apologize for the duplicate charge on your account. This was our error, and we take full responsibility.\n\nWe have initiated a full refund that will appear within 3-5 business days. Additionally, we've added a 10% credit to your next invoice as a token of our appreciation for your patience.\n\nPlease don't hesitate to reach out if you have any questions.\n\nWarm regards,\nCustomer Success Team",
            "A customer's PDF export feature crashes on iOS 17 following the v2.3 update, blocking their end-of-month reporting. Reinstallation has not resolved the issue.",
            "true",
        ],
        "gpt-4o": [
            "high",
            "Hi [Name],\n\nI'm so sorry about the double charge — this is completely our fault and we're fixing it right away. A full refund has been processed and should appear in 3-5 business days.\n\nThanks for your patience, and please reach out if anything else comes up.\n\nBest,\nSupport Team",
            "The customer is experiencing app crashes when using the PDF export feature on iOS 17 after the v2.3 update, which is preventing their end-of-month reporting. They have attempted reinstallation without success.",
            "true",
        ],
        "gemini-1.5-pro": [
            "medium",  # wrong — hallucination
            "Dear Customer,\n\nThank you for reaching out. We apologize for the billing error. A refund will be processed shortly.\n\nBest regards",
            "Customer reports a crash in the PDF export feature on iOS 17. The crash occurs specifically when exporting large files over 10MB.",
            "true",
        ],
    }

    for model in MODELS:
        for i, case_id in enumerate(cs_case_ids):
            score = cs_scores_run1[model][i]
            output = cs_outputs_run1[model][i]
            hallucination = model == "gemini-1.5-pro" and i == 0
            hall_exp = "Model responded 'medium' instead of 'high' — incorrect severity classification." if hallucination else None
            results_data.append({
                "run_id": run1_id, "test_case_id": case_id, "model": model,
                "output": output, "score": score, "passed": score >= 0.7,
                "hallucination_detected": hallucination,
                "hallucination_explanation": hall_exp,
                "judge_reasoning": f"Score reflects {'strong' if score >= 0.85 else 'adequate' if score >= 0.7 else 'poor'} alignment with expected output.",
                "latency_ms": random.randint(800, 2800),
                "input_tokens": random.randint(120, 340),
                "output_tokens": random.randint(40, 180),
            })

    # --- Run 2: CS after prompt update (slight score drop on case 3 for regression) ---
    cs_scores_run2 = {
        "claude-sonnet-4-20250514": [1.0, 0.93, 0.72, 1.0],  # case 3 dropped slightly
        "gpt-4o":                   [1.0, 0.86, 0.81, 1.0],
        "gemini-1.5-pro":           [1.0, 0.78, 0.69, 1.0],  # fixed hallucination, case 3 regression
    }

    for model in MODELS:
        for i, case_id in enumerate(cs_case_ids):
            score = cs_scores_run2[model][i]
            results_data.append({
                "run_id": run2_id, "test_case_id": case_id, "model": model,
                "output": cs_outputs_run1[model][i],  # reuse outputs for seed simplicity
                "score": score, "passed": score >= 0.7,
                "hallucination_detected": False,
                "hallucination_explanation": None,
                "judge_reasoning": f"Score reflects {'strong' if score >= 0.85 else 'adequate' if score >= 0.7 else 'poor'} response quality.",
                "latency_ms": random.randint(700, 2600),
                "input_tokens": random.randint(120, 340),
                "output_tokens": random.randint(40, 180),
            })

    # --- Run 3: Code generation ---
    code_scores = {
        "claude-sonnet-4-20250514": [0.92, 0.88, 0.87, 0.94],
        "gpt-4o":                   [0.95, 0.82, 0.91, 0.89],  # GPT-4o leads on code
        "gemini-1.5-pro":           [0.81, 0.74, 0.83, 0.76],
    }
    code_outputs = {
        "claude-sonnet-4-20250514": [
            "```python\ndef binary_search(arr: list, target: int) -> int:\n    \"\"\"\n    Search for target in sorted arr.\n    Returns index if found, -1 otherwise.\n    \"\"\"\n    if not arr:\n        return -1\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n```",
            "This error means your function is calling itself too many times without reaching a base case. Python limits recursion depth (default ~1000) to prevent stack overflow. Fix: add a base case, or rewrite iteratively using a loop.",
            "```python\ndf[df['status'] == 'completed'].groupby('customer_id')['order_total'].sum().reset_index(name='total_spent').sort_values('total_spent', ascending=False).head(10)\n```",
            "The bug is the dependency array `[user]`. Change it to `[userId]`. With `[user]`, the effect runs every time `user` state changes — fetching sets user, which triggers the effect again, creating an infinite loop.",
        ],
        "gpt-4o": [
            "```python\ndef binary_search(nums: list[int], target: int) -> int:\n    \"\"\"\n    Performs binary search on a sorted list.\n    Time complexity: O(log n)\n    Returns: index of target, or -1 if not found\n    \"\"\"\n    if not nums:\n        return -1\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = lo + (hi - lo) // 2\n        if nums[mid] == target:\n            return mid\n        if nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n```",
            "RecursionError means your function keeps calling itself and never stops. Python has a recursion limit (~1000 calls) to protect memory. Solutions: (1) Add a proper base case to stop recursion, (2) Use an iterative approach with a while loop, (3) Increase limit with sys.setrecursionlimit() as a last resort.",
            "```python\n(df[df['status'] == 'completed']\n   .groupby('customer_id')['order_total']\n   .sum()\n   .reset_index(name='total_spent')\n   .sort_values('total_spent', ascending=False)\n   .head(10))\n```",
            "The issue is `[user]` in the dependency array. When `user` is null, the fetch runs and sets `user`. This triggers a re-render, which sees `user` changed, runs the effect again — infinite loop. Fix: use `[userId]` so it only fetches when the ID changes.",
        ],
        "gemini-1.5-pro": [
            "```python\ndef binary_search(arr, target):\n    left = 0\n    right = len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n```",
            "This error occurs when a recursive function calls itself too many times. Add a base case to stop the recursion, or convert the function to use iteration instead.",
            "```python\nresult = df[df['status']=='completed'].groupby('customer_id')['order_total'].sum().nlargest(10).reset_index()\nresult.columns = ['customer_id', 'total_spent']\n```",
            "Change `[user]` to `[userId]` in the useEffect dependency array to fix the infinite loop.",
        ],
    }

    for model in MODELS:
        for i, case_id in enumerate(code_case_ids):
            score = code_scores[model][i]
            results_data.append({
                "run_id": run3_id, "test_case_id": case_id, "model": model,
                "output": code_outputs[model][i],
                "score": score, "passed": score >= 0.7,
                "hallucination_detected": False,
                "hallucination_explanation": None,
                "judge_reasoning": f"{'Excellent' if score >= 0.9 else 'Good' if score >= 0.8 else 'Adequate'} response demonstrating {'strong' if score >= 0.9 else 'solid'} technical accuracy.",
                "latency_ms": random.randint(1200, 3500),
                "input_tokens": random.randint(200, 450),
                "output_tokens": random.randint(100, 380),
            })

    # --- Run 4: Content ---
    content_scores = {
        "claude-sonnet-4-20250514": [0.91, 0.89, 0.93],
        "gpt-4o":                   [0.85, 0.92, 0.88],
        "gemini-1.5-pro":           [0.78, 0.81, 0.74],
    }
    content_outputs = {
        "claude-sonnet-4-20250514": [
            "Most AI engineers skip the one thing that separates good prompts from production-ready ones.",
            "• LLM evaluation systematically measures AI outputs against defined criteria rather than relying on manual spot-checks.\n• Scoring methods range from exact match for deterministic outputs to semantic similarity and LLM-as-judge for subjective quality.\n• Effective evaluations are automated, repeatable, and tied to real use cases rather than generic benchmarks.",
            "EvalKit provides a systematic assessment of prompt efficacy and reliability, equipping engineers with the necessary instrumentation to verify that AI-powered integrations perform as intended within production environments.",
        ],
        "gpt-4o": [
            "Your AI works in testing. Here's why it fails in production.",
            "• LLM evaluation systematically tests AI outputs against defined quality criteria rather than relying on gut feeling.\n• Three key scoring methods exist: exact match for precise outputs, semantic similarity for paraphrase tolerance, and LLM-as-judge for nuanced quality assessment.\n• The most effective evaluations are automated, repeatable processes aligned with specific use cases rather than general benchmarks.",
            "EvalKit systematically evaluates prompt performance and reliability, providing development teams with the tools required to ensure AI integrations function correctly and consistently in production environments.",
        ],
        "gemini-1.5-pro": [
            "Most engineers don't think about AI evaluation until something breaks in production.",
            "• LLM evaluation measures AI outputs systematically rather than relying on manual reviews.\n• Methods include exact match, semantic similarity, and LLM-as-judge scoring.\n• Good evaluations should be automated and specific to your use case.",
            "EvalKit is a tool that checks whether AI prompts are working correctly. It can be used by developers to make sure their AI features work well in production.",
        ],
    }

    for model in MODELS:
        for i, case_id in enumerate(content_case_ids):
            score = content_scores[model][i]
            results_data.append({
                "run_id": run4_id, "test_case_id": case_id, "model": model,
                "output": content_outputs[model][i],
                "score": score, "passed": score >= 0.7,
                "hallucination_detected": False,
                "hallucination_explanation": None,
                "judge_reasoning": f"{'Strong' if score >= 0.9 else 'Good' if score >= 0.8 else 'Adequate'} adherence to rubric criteria.",
                "latency_ms": random.randint(600, 1800),
                "input_tokens": random.randint(100, 280),
                "output_tokens": random.randint(40, 200),
            })

    # Insert all results
    for r in results_data:
        cost = round(
            (r["input_tokens"] / 1000 * _input_price(r["model"])) +
            (r["output_tokens"] / 1000 * _output_price(r["model"])),
            6,
        )
        await conn.execute("""
            INSERT INTO results
              (run_id, test_case_id, model, output, score, passed,
               hallucination_detected, hallucination_explanation, judge_reasoning,
               latency_ms, input_tokens, output_tokens, cost_usd)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        """,
            r["run_id"], r["test_case_id"], r["model"],
            r["output"], r["score"], r["passed"],
            r["hallucination_detected"], r["hallucination_explanation"],
            r["judge_reasoning"], r["latency_ms"],
            r["input_tokens"], r["output_tokens"], cost,
        )

    await conn.close()
    print(f"✓ Seeded: 3 suites, {len(cs_case_ids + code_case_ids + content_case_ids)} test cases, 4 runs, {len(results_data)} results")


def _input_price(model: str) -> float:
    prices = {
        "claude-sonnet-4-20250514": 0.003,
        "gpt-4o": 0.005,
        "gemini-1.5-pro": 0.00125,
    }
    return prices.get(model, 0.003)


def _output_price(model: str) -> float:
    prices = {
        "claude-sonnet-4-20250514": 0.015,
        "gpt-4o": 0.015,
        "gemini-1.5-pro": 0.005,
    }
    return prices.get(model, 0.015)


if __name__ == "__main__":
    asyncio.run(main())
