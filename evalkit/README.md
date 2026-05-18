# EvalKit

Self-hosted AI evaluation framework. Test prompts across multiple LLMs simultaneously, track cost and latency, detect hallucinations, and compare model performance over time.

## What it does

- **Multi-model eval** — run a test suite against any combination of Claude, GPT-4o, or Gemini in parallel
- **4 scoring methods** — exact match, semantic similarity (Voyage AI), LLM-as-judge (Claude), and rubric-based scoring
- **Hallucination detection** — Claude judges flag and explain detected hallucinations per result
- **Cost & latency tracking** — every run records token counts, cost, and latency per model
- **Regression detection** — Compare page highlights score drops ≥10% vs a baseline run
- **SSE streaming** — results appear live as they complete, no polling needed
- **Demo mode** — `DEMO_MODE=true` shows pre-seeded data and disables live runs (for portfolio display)

## Quick start

```bash
cp .env.example .env
# fill in API keys

docker compose up -d
docker compose run --rm seed
```

Open `http://localhost` (or whatever `PORT` you set).

## Models

| Model | Provider | Input | Output |
|-------|----------|-------|--------|
| Claude Sonnet 4 | Anthropic | $3.00/1M | $15.00/1M |
| Claude Haiku 4 | Anthropic | $0.80/1M | $4.00/1M |
| GPT-4o | OpenAI | $2.50/1M | $10.00/1M |
| GPT-4o Mini | OpenAI | $0.15/1M | $0.60/1M |
| Gemini 1.5 Pro | Google | $1.25/1M | $5.00/1M |
| Gemini 1.5 Flash | Google | $0.075/1M | $0.30/1M |

## Scoring methods

| Method | How it works | Best for |
|--------|-------------|----------|
| `exact` | String equality | Classification, structured outputs |
| `semantic` | Voyage AI cosine similarity (≥0.85 = pass) | Paraphrase, summarization |
| `llm_judge` | Claude Sonnet 4 scores 0–1 against expected | Open-ended, nuanced |
| `rubric` | Claude Sonnet 4 scores against criteria (no expected output) | Creative, no ground truth |

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `GOOGLE_API_KEY` | Yes | — | Google AI API key |
| `VOYAGE_API_KEY` | No | — | Voyage AI key (semantic scoring) |
| `ALLOWED_ORIGIN` | No | `http://localhost:5173` | CORS allowed origin |
| `DEMO_MODE` | No | `false` | Disable live runs, show demo banner |
| `PORT` | No | `80` | Host port for Docker Compose |

## Deployment (AWS EC2)

1. Install Docker + Docker Compose on your EC2 instance
2. Clone the repo and `cp .env.example .env`
3. Set up DNS: `evalkit.danblanco.dev` → EC2 public IP
4. Get a TLS cert: `certbot certonly --nginx -d evalkit.danblanco.dev`
5. Copy `nginx.conf` to `/etc/nginx/sites-available/evalkit` and enable it
6. Run `./deploy.sh`

For subsequent deploys: `./deploy.sh` (pulls, rebuilds, restarts, re-runs seed).

## Architecture

```
nginx (host, TLS termination)
  └── Docker Compose
        ├── frontend  (Nginx, serves React SPA, proxies /api → backend)
        ├── backend   (FastAPI + asyncpg, port 8000)
        ├── db        (pgvector/pgvector:pg16, port 5432)
        └── seed      (one-shot, idempotent)
```

## Stack

- **Backend**: Python 3.12, FastAPI, asyncpg, asyncio, sse-starlette
- **Frontend**: React 18, Vite, Tailwind CSS, React Query, Recharts
- **Database**: PostgreSQL 16 + pgvector
- **LLM SDKs**: anthropic (async), openai (async), google-generativeai
