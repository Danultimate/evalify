# EvalKit

**Self-hosted LLM evaluation. Docker compose. Multi-provider. Live results.**

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20pgvector-success)](#stack)
[![Self-hosted](https://img.shields.io/badge/self--hosted-docker%20compose-informational)](#60-second-quickstart)
[![Demo](https://img.shields.io/badge/demo-evalkit.danblanco.dev-blueviolet)](https://evalkit.danblanco.dev)

![EvalKit dashboard](docs/dashboard.png)

> ⚠️ **Pre-release.** Multi-model runs, four scoring methods, SSE streaming, cost/latency tracking, and regression compare are implemented end-to-end. Schemas may still shift — don't depend on this in production yet.

Point EvalKit at any combination of Claude, GPT-4o, and Gemini and get a side-by-side scored comparison of how each one handles your test suite — with token cost, latency, hallucination flags, and a baseline-vs-current regression view. No SaaS signup, no vendor SDK lock-in, no opaque scores. The whole thing runs on one `docker compose up`.

```bash
cp .env.example .env   # add your API keys
docker compose up -d && docker compose run --rm seed
```

---

## Why EvalKit

| | EvalKit | [Promptfoo](https://github.com/promptfoo/promptfoo) | [OpenAI Evals](https://github.com/openai/evals) | [LangSmith](https://smith.langchain.com/) | [Helicone](https://github.com/Helicone/helicone) |
|---|:---:|:---:|:---:|:---:|:---:|
| Self-hosted, no account, no SaaS                       | ✅ | ✅ | ✅ | — | partial (self-host) |
| Multi-provider runs in parallel (Claude + GPT + Gemini)| ✅ | ✅ | partial | partial | n/a (passive logging) |
| **4 scoring methods in one suite** (exact / semantic / LLM-judge / rubric) | ✅ | partial | partial | partial | — |
| Hallucination detection with judge rationale           | ✅ | — | — | — | — |
| **Live SSE streaming** of results as they complete     | ✅ | — | — | partial | — |
| Per-result token cost + latency, per-model rollups     | ✅ | partial | — | ✅ | ✅ |
| Baseline-vs-current regression compare (≥10% drop highlight) | ✅ | partial | — | partial | — |
| Demo mode for portfolio / read-only display            | ✅ | — | — | — | — |
| Web UI out of the box                                  | ✅ | partial (viewer) | — | ✅ | ✅ |
| Cloud storage / hosted dashboard                       | — | — | — | ✅ | ✅ |

**Where EvalKit fits:** when you want a *single dashboard* that runs the same suite against three providers at once, scores it four different ways, and shows you the cost/latency/regression view without sending your prompts or completions to anyone else's server. Promptfoo gives you a powerful CLI; LangSmith gives you a hosted UI tied to the LangChain stack. EvalKit gives you a small, opinionated webapp you can `docker compose up` on a $5 VPS and share with your team.

---

## 60-second quickstart

**1. Clone and configure.**

```bash
git clone https://github.com/Danultimate/evalkit.git
cd evalkit
cp .env.example .env
```

Fill in at least `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and `GOOGLE_API_KEY`. Add `VOYAGE_API_KEY` if you want semantic scoring.

**2. Bring up the stack.**

```bash
docker compose up -d
docker compose run --rm seed
```

`seed` is idempotent — it waits for the backend to be healthy, then loads a sample suite (`General Knowledge QA`) plus one demo run so the dashboard isn't empty on first boot.

**3. Open the app.**

```
http://localhost
```

You land on the dashboard. Pick a suite, choose the models you want to run, and click **Run**. Results stream in live via SSE — no refresh, no polling.

<details>
<summary><b>Run a suite from the API (no UI)</b></summary>

```bash
curl -X POST http://localhost/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "suite_id": "<uuid>",
    "models": ["claude-sonnet-4", "gpt-4o", "gemini-1.5-pro"]
  }'
```

Then stream results:

```bash
curl -N http://localhost/api/runs/<run_id>/stream
# event: result
# data: {"case_id": "...", "model": "claude-sonnet-4", "score": 0.92, "cost_usd": 0.0031, "latency_ms": 1140}
```

The stream closes with `event: done` when every (case × model) cell has settled.
</details>

<details>
<summary><b>Demo mode (portfolio / read-only)</b></summary>

Set `DEMO_MODE=true` in `.env` and restart. The seed run still loads, but the **Run** button is disabled, a banner appears, and any POST to `/api/runs` returns 403. Useful for sharing a public URL without burning API credits.
</details>

---

## Scoring methods

EvalKit ships four scoring methods. Pick one per test case — the suite can mix them freely.

| Method | How it works | Best for | Needs |
|---|---|---|---|
| `exact` | String equality on the trimmed completion | Classification, structured outputs, regex-able answers | — |
| `semantic` | [Voyage AI](https://www.voyageai.com/) embedding + cosine similarity (≥ 0.85 = pass) | Paraphrase, summarisation, "same meaning, different words" | `VOYAGE_API_KEY` |
| `llm_judge` | Claude Sonnet 4 scores the completion 0–1 against `expected_output` | Open-ended QA, tone, nuance | `ANTHROPIC_API_KEY` |
| `rubric` | Claude Sonnet 4 scores against a free-text rubric — no ground truth required | Creative writing, no single right answer | `ANTHROPIC_API_KEY` |

Each result records the chosen method, the raw score, and (for judge / rubric) the judge's written rationale. The rationale doubles as the hallucination explanation — see below.

---

## Hallucination detection

When a test case has an `expected_output`, every judge-scored result also returns a `hallucination_flag` plus an explanation. The judge prompt asks Claude to flag responses that introduce facts not supported by the expected answer — not just low-scoring ones. Flagged results turn red in the dashboard with the rationale expandable inline.

```
✗ gpt-4o · score 0.42 · ⚠ hallucination
  rationale: "The response claims the treaty was signed in 1947;
              the expected answer correctly states 1949."
```

Heuristic-only suites (no judge configured, no `expected_output`) don't run hallucination detection — the flag is `null`, not `false`.

---

## Cost & latency tracking

Every (test case × model) cell records:

- **Input tokens** and **output tokens** as returned by the provider
- **USD cost**, computed from a built-in pricing table (see [Models](#models)) with longest-prefix matching so versioned IDs resolve correctly
- **Latency**, measured end-to-end from request dispatch to final token

Per-run rollups live on the run detail page: total cost, total latency, cost-per-model bar chart, and a per-model average score. Per-case rollups appear on the suite page so you can spot the cases that eat your budget.

---

## Regression detection

The **Compare** page takes two runs (a baseline and a current) and highlights any case where the current score drops ≥ 10% versus baseline, per model. Useful when you change a system prompt, swap a model version, or refactor your retrieval layer and want to know *which specific cases* got worse — not just whether the average moved.

```
case "translate idiom: 'cost an arm and a leg'"
  baseline (run 2026-05-15): claude-sonnet-4  0.94   gpt-4o  0.91
  current  (run 2026-05-22): claude-sonnet-4  0.96   gpt-4o  0.67  ↓ regression
```

---

## Models

| Model | Provider | Input ($/1M) | Output ($/1M) |
|---|---|---:|---:|
| Claude Sonnet 4 | Anthropic | $3.00 | $15.00 |
| Claude Haiku 4 | Anthropic | $0.80 | $4.00 |
| GPT-4o | OpenAI | $2.50 | $10.00 |
| GPT-4o Mini | OpenAI | $0.15 | $0.60 |
| Gemini 1.5 Pro | Google | $1.25 | $5.00 |
| Gemini 1.5 Flash | Google | $0.075 | $0.30 |

Pricing is read from `backend/services/cost_tracker.py` — edit the table there to add models or override negotiated rates. Unknown models cost `0` and emit a warning so the run still completes.

---

## Architecture

```
nginx (host, TLS termination, /api proxy)
  └── Docker Compose
        ├── frontend  (Nginx, serves React SPA, proxies /api → backend)
        ├── backend   (FastAPI + asyncpg, port 8000)
        ├── db        (pgvector/pgvector:pg16, port 5432)
        └── seed      (one-shot, idempotent — waits for backend health)
```

The backend fans out one HTTP request per `(case, model)` cell into `asyncio.gather`, scores each result as it returns, and pushes it onto an SSE channel keyed by `run_id`. The frontend's React Query client subscribes to that stream and renders cells incrementally — first arrival is usually under a second.

## Stack

- **Backend** · Python 3.12, FastAPI, asyncpg, asyncio, sse-starlette
- **Frontend** · React 18, Vite, Tailwind CSS, React Query, Recharts
- **Database** · PostgreSQL 16 + pgvector (semantic similarity)
- **LLM SDKs** · `anthropic` (async), `openai` (async), `google-generativeai`

---

## Environment variables

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `ANTHROPIC_API_KEY` | ✅ | — | Anthropic API key — required for Claude runs and `llm_judge` / `rubric` scoring |
| `OPENAI_API_KEY` | ✅ | — | OpenAI API key |
| `GOOGLE_API_KEY` | ✅ | — | Google AI API key (Gemini) |
| `VOYAGE_API_KEY` | — | — | Voyage AI key — required for `semantic` scoring |
| `ALLOWED_ORIGIN` | — | `http://localhost:5173` | CORS allowed origin |
| `DEMO_MODE` | — | `false` | Disable live runs, show demo banner |
| `PORT` | — | `80` | Host port for Docker Compose |

---

## Deployment (AWS EC2)

1. Install Docker + Docker Compose on your EC2 instance.
2. Clone the repo and `cp .env.example .env`.
3. Point DNS at the box: `evalkit.danblanco.dev` → EC2 public IP.
4. Get a TLS cert: `certbot certonly --nginx -d evalkit.danblanco.dev`.
5. Copy `nginx.conf` to `/etc/nginx/sites-available/evalkit` and enable it.
6. Run `./deploy.sh`.

Subsequent deploys: `./deploy.sh` (pulls, rebuilds, restarts, re-runs seed).

---

## Non-goals

- **No SaaS, no hosted dashboard.** Runs live in your Postgres. Bring your own backups.
- **No model fine-tuning or training loop.** EvalKit grades; it does not train.
- **No agent / tool-use harness.** Test cases are single-turn `(system, user) → completion`. Multi-turn / tool-using agents are out of scope for v1 — pair EvalKit with a tracer like [TraceForge](https://github.com/Danultimate/traceforge) for that workflow.
- **No auto-generated test cases.** You write the suite; EvalKit scores it.

---

## Status

| Feature | Status |
|---|---|
| Multi-provider parallel runs (Claude + OpenAI + Gemini) | ✅ shipped |
| `exact` / `semantic` / `llm_judge` / `rubric` scoring | ✅ shipped |
| Hallucination detection (judge-flagged + rationale) | ✅ shipped |
| Per-result + per-run cost & latency tracking | ✅ shipped |
| SSE live result streaming | ✅ shipped |
| Baseline-vs-current regression compare (≥10% drop highlight) | ✅ shipped |
| Demo mode (read-only public deploy) | ✅ shipped |
| Idempotent seed container | ✅ shipped |
| API auth / multi-user | deferred |
| Scheduled / cron runs | deferred |
| Custom scoring plugins | deferred |
| Multi-turn / tool-use suites | non-goal (see [Non-goals](#non-goals)) |

Track progress and propose features via [GitHub Issues](https://github.com/Danultimate/evalkit/issues).

---

## License

[Apache 2.0](LICENSE).
