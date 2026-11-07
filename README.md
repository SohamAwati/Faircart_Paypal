# FairCart Guard

**Your AI procurement agent: smarter decisions, safer spending.**

FairCart Guard helps college clubs, small businesses and organisations buy from vendors with evidence instead of guesswork. A buyer creates a purchase request, collects vendor quotations, and the agent extracts prices and terms, flags hidden or ambiguous charges, enforces purchasing rules in code, ranks eligible vendors with a transparent score, and explains the recommendation. The buyer approves the exact quotation and amount, then pays through **PayPal sandbox** checkout. The backend captures and verifies the payment before anything is shown as successful.

> **What it is not:** it does not just pick the cheapest vendor, and it does not let an AI model decide money or approvals.

> **Status:** this README describes the target design and contract. Sections marked *(planned)* are not built until the team confirms them. Do not treat any integration as working until its test or sandbox run is recorded in `docs/`.

## Core principles

| Principle | Meaning |
|---|---|
| AI analyses and recommends | The LLM reads documents and writes explanations. It never computes authoritative money and never touches payment. |
| Backend code enforces rules | Budget, deadline, specifications, completeness and quote validity are deterministic TypeScript. |
| The buyer authorises | Approval is bound to the exact quote ID, amount and currency. Any change invalidates it. |
| PayPal processes the payment | Orders v2 create, buyer approves on PayPal, the backend captures. Sandbox only. |
| The app verifies and records | Capture status, amount and currency are verified server-side; IDs are stored; webhooks reconcile idempotently. |

## Honest limitations

- Payments go to **one configured PayPal sandbox merchant**. The recommended vendor is **not** the PayPal payee. There are no payouts or split payments.
- PayPal does not support domestic INR payments in India (see `docs/payments.md`); the team's currency decision is recorded in `docs/paypal-spike.md`.
- **Demo mode** uses labelled sample data. Live mode never silently falls back to mock analysis.
- Free LLM tiers have rate limits and may log prompts: use sample data only. See the AI provider notes in `docs/architecture.md`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query |
| Backend | Node.js 20, Express, TypeScript, Zod |
| Database | PostgreSQL, Prisma (Decimal money) |
| AI | Provider-neutral `LLMClient`: Google Gemini (free tier, default for development) and Anthropic Claude (optional) |
| Payments | PayPal Orders v2, Sandbox, Webhooks; PayPal Agent Toolkit (read-only, optional) |
| Testing | Vitest, supertest, msw |
| Deployment | Render (web service, static site, Postgres), GitHub Actions CI |

## Repository layout

```
faircart-guard/
  apps/
    web/   React app (components, pages, features, hooks, lib, types)
    api/   Express API (routes, controllers, services/{ai,procurement,paypal}, middleware, schemas, prisma, tests)
  docs/    architecture.md, api.md, payments.md, deployment.md, demo-script.md, paypal-spike.md
  postman/ faircart-guard.postman_collection.json
  .env.example
```

## Quick start (local)

Prerequisites: Node 20, Docker (or local PostgreSQL 16), a PayPal Developer account with a sandbox app, and optionally an LLM API key.

```bash
git clone <repo-url> faircart-guard && cd faircart-guard
cp .env.example .env            # fill values, never commit .env
docker run -d --name faircart-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=faircart -p 5432:5432 postgres:16
npm ci
npx prisma migrate dev --schema apps/api/prisma/schema.prisma
npm run seed -w apps/api        # demo vendors, quotes and request
npm run dev                     # API on :4000, web on :5173
```

Open http://localhost:5173. With `DEMO_MODE=true` the app runs on labelled deterministic sample data and needs no LLM key.

### Environment variables

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | Runtime (default port 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DEMO_MODE` | `true` = labelled sample data; `false` = live AI and sandbox payment |
| `LLM_PROVIDER` | `gemini` or `anthropic` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini settings (free tier for development) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Optional Claude settings |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox app credentials (backend only) |
| `PAYPAL_BASE_URL` | Must be `https://api-m.sandbox.paypal.com` (validated at startup) |
| `PAYPAL_WEBHOOK_ID` | ID of the sandbox webhook pointing at your API URL |
| `USE_PAYPAL_TOOLKIT` | `true` enables the read-only Agent Toolkit tools (default `false`) |
| `FRONTEND_URL`, `API_BASE_URL` | Used for CORS and PayPal return/cancel URLs |

Never expose `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` or `PAYPAL_CLIENT_SECRET` to the frontend.

## How a purchase works

1. Create a purchase request (item, quantity, budget, currency, deadline, specifications).
2. Add vendor quotations (PDF upload or manual entry).
3. Extraction: PDF text, then the LLM returns validated JSON with evidence. Unknown stays unknown. The buyer reviews uncertain fields.
4. Analysis: backend calculates totals, then the LLM flags hidden, ambiguous or inconsistent charges with evidence.
5. Rules (code): budget, deadline, specifications, completeness, validity, no silent acceptance of uncertain data.
6. Ranking (code): configurable weights, default cost 45, delivery 25, specifications 20, completeness 10.
7. Buyer approves the exact quotation and amount.
8. PayPal sandbox order is created and the buyer approves on PayPal.
9. Backend captures and verifies status, amount and currency; IDs are stored; webhooks reconcile.
10. Purchase summary and history.

## Testing

```bash
npm run typecheck --workspaces --if-present
npm test --workspaces --if-present      # PayPal and LLM calls are mocked
npm run build --workspaces --if-present
```

Automated tests use mocked responses. A test counts as a real PayPal result only after a manual sandbox checkout is recorded with order and capture IDs in `docs/paypal-spike.md`.

## Documentation

| Doc | Contents |
|---|---|
| `docs/architecture.md` | Components, data flow, trust boundaries, state machines, ranking, security |
| `docs/api.md` | Every endpoint: request, response, errors |
| `docs/payments.md` | PayPal flow, verification rules, webhooks, idempotency, toolkit, currency policy |
| `docs/deployment.md` | Render setup, migrations, webhooks, CORS, health check, troubleshooting |
| `docs/demo-script.md` | The 10-scene demo with talking points and fallbacks |
| `docs/paypal-spike.md` | Sandbox spike and Agent Toolkit findings (fill in as you run them) |

## Postman

Import `postman/faircart-guard.postman_collection.json` and set `baseUrl`. The create-order request returns an `approvalUrl`: open it in a browser, approve as the sandbox buyer, then run capture-order.

## Troubleshooting

See the troubleshooting tables in `docs/payments.md` and `docs/deployment.md`.
