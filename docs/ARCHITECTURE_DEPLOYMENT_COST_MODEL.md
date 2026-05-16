# SONARA — Architecture, Deployment & Cost Model

**Companion Document to PRD v1.0**

Version: 1.0 | Date: 3 May 2026 | Audience: Engineering (Cursor) | CONFIDENTIAL

> **PURPOSE** — This document complements the Sonara PRD (v1.0) with the operational engineering detail Cursor needs to build and ship a production system: a definitive infrastructure topology, a complete CI/CD pipeline specification, and a granular cost model projecting spend from free tier through to 10,000 active users. All PRD section cross-references are noted in brackets (e.g. §10.3).

---

## Table of Contents

1. [Infrastructure Topology](#1-infrastructure-topology)
2. [Deployment Architecture](#2-deployment-architecture)
3. [CI/CD Pipeline](#3-cicd-pipeline)
4. [Cost Model](#4-cost-model)
5. [Monitoring & Observability](#5-monitoring--observability)
6. [Security Architecture](#6-security-architecture)
7. [Local Development Setup](#7-local-development-setup)
8. [Phase 4 — Server generation](#8-phase-4--server-generation)

---

## 1. Infrastructure Topology

The following describes the complete production infrastructure for Sonara across three logical tiers: Edge/CDN, Application, and Data. This topology implements all architectural principles stated in PRD §5.2 and satisfies the deployment requirement from PRD §10 Phase 5, Step 5.7.

### 1.1 Tier Overview

| Tier | Service | Responsibility | PRD Requirement |
| :--- | :--- | :--- | :--- |
| Edge / CDN | Vercel Edge Network | Static asset delivery, ISR, Edge middleware (auth guard, rate-limit headers) | NFR-PERF-03, NFR-SEC-01 |
| Application | Vercel Serverless Functions | Next.js 15 server components, API routes (`/api/v1/*`), job polling endpoints | §5.1, §8.2 |
| Application | Railway Worker (Node 20) | Long-running AI job processor: polls Replicate webhooks, writes results to DB | §5.2 Async Job Pattern |
| Data | Supabase (PostgreSQL 15) | Primary database: users, projects, setlists, audio_assets, generation_jobs | §8.1 |
| Data | Supabase Storage (S3-compatible) | Audio file storage with pre-signed URL access; private bucket | NFR-SEC-03 |
| Data | Upstash Redis | Rate-limit counters, job queue, session cache | NFR-SEC-04 |
| Observability | Sentry | Error tracking, performance monitoring, session replay | NFR-REL-01 |
| Observability | Vercel Analytics | Core Web Vitals, Lighthouse CI, page-load metrics | NFR-PERF-03 |

### 1.2 Network & Data Flow Diagram

The diagram below shows the request path for the two most latency-sensitive flows: a page load (synchronous) and an AI generation job (asynchronous).

```
┌──────────────────────────────────────────────────────────────────┐
│                      USER BROWSER                               │
│   React UI  ◄──── Zustand Stores ◄──── Web Audio Engine        │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼──────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                          │
│   Edge Middleware: Auth check (JWT) → Rate-limit header inject  │
│   Static assets: JS/CSS bundles (immutable, long-cache TTL)     │
└──────────┬───────────────────────────────────┬───────────────────┘
           │ SSR / API                          │ Static hit → cache
┌──────────▼────────────────┐                  │
│  VERCEL SERVERLESS FNs    │                  │
│  /api/v1/generate  ───────┼──── POST ───────►│  REPLICATE API
│  /api/v1/separate  ───────┼──── POST ───────►│  (MusicGen / Demucs)
│  /api/v1/jobs/:id  ◄──────┼──── Webhook ─────┤
│  /api/v1/projects  ───┐   │
└───────────────────────┼───┘
           │            │
           │ Drizzle ORM│ write job result
┌──────────▼────────────▼──────────────────────┐
│         SUPABASE (PostgreSQL 15)             │
│  users / projects / setlists                 │
│  audio_assets / generation_jobs              │
└──────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────┐
│     SUPABASE STORAGE (S3-compat)        │
│  audio/{userId}/{assetId}.wav           │
│  stems/{jobId}/{vocals|drums|bass|other}│
│  Access: pre-signed URLs (1hr expiry)   │
└─────────────────────────────────────────┘
```

> **ENGINEERING NOTE** — Replicate webhooks are the preferred notification mechanism over client-side polling wherever possible. Configure each Replicate prediction with `webhook: process.env.REPLICATE_WEBHOOK_URL` pointing to `/api/v1/webhooks/replicate`. This eliminates redundant polling requests and reduces database load.

### 1.3 Environment Configuration

Three environments must be maintained with strict variable isolation. No production secret must ever appear in a development environment.

| Variable | development | preview | production |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Local Postgres (Docker) | Supabase branch DB | Supabase main DB |
| `REPLICATE_API_TOKEN` | Personal test token | Shared team token | Dedicated prod token |
| `REPLICATE_WEBHOOK_URL` | ngrok tunnel (local) | Vercel preview URL | `api.sonara.app/api/v1/webhooks/replicate` |
| `NEXTAUTH_SECRET` | Any 32-char string | Rotated per branch | KMS-managed secret |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://*.vercel.app` | `https://app.sonara.app` |
| `STORAGE_BUCKET` | `sonara-dev` | `sonara-preview` | `sonara-prod` |
| `UPSTASH_REDIS_URL` | Local Redis (Docker) | Upstash free tier | Upstash paid tier |
| `SENTRY_DSN` | Optional | Required | Required |
| `RATE_LIMIT_GENERATE_PH` | `100` (disabled) | `10` | `10` |

**Secret management:** All production secrets are stored in Vercel Environment Variables (encrypted at rest). Secrets are never committed to the repository. The `.env.local` file is git-ignored. A `.env.example` file with placeholder values documents the required keys for new developers.

---

## 2. Deployment Architecture

### 2.1 Vercel Configuration (`vercel.json`)

The following configuration must be committed to the repository root. It enforces function timeouts appropriate for the polling endpoints, configures security response headers, and defines regional routing to minimise latency for the primary UK/EU user base.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["lhr1", "iad1"],
  "functions": {
    "src/app/api/v1/generate/route.ts":   { "maxDuration": 30 },
    "src/app/api/v1/separate/route.ts":   { "maxDuration": 30 },
    "src/app/api/v1/master/route.ts":     { "maxDuration": 60 },
    "src/app/api/v1/jobs/[id]/route.ts":  { "maxDuration": 10 },
    "src/app/api/v1/webhooks/route.ts":   { "maxDuration": 30 }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",        "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy",        "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",     "value": "camera=(), microphone=(self)" }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

> **REGION RATIONALE** — `lhr1` (London Heathrow) is designated as the primary region, consistent with the project's UK base. `iad1` (US East) is included as a fallback. Vercel automatically routes requests to the nearest healthy region. This satisfies NFR-PERF-03 (LCP under 3 seconds on standard broadband).

### 2.2 Database Deployment (Supabase)

The database is managed via Drizzle ORM with migration files committed to the repository. The following process governs schema changes:

1. Create a new migration: `npx drizzle-kit generate:pg` — naming convention: `NNNN_description.sql`
2. Review the generated SQL in `drizzle/migrations/` before committing.
3. Migrations are applied automatically in CI on the preview database, and manually with approval in production (see §3.4, Deployment Gate).
4. **Rollback:** Drizzle does not auto-generate rollback scripts. Rollback migrations must be written manually and reviewed before production deployment.

| Migration | Description | Phase (PRD §10) |
| :--- | :--- | :--- |
| `0001_initial_schema` | `users`, `projects`, `setlists`, `audio_assets`, `generation_jobs` tables | Phase 2, Step 2.1–2.2 |
| `0002_add_indexes` | Indexes on `user_id` FK columns and `generation_jobs.status` for polling performance | Phase 2, Step 2.1 |
| `0003_add_rls_policies` | Row-Level Security policies so users can only read/write their own rows | Phase 2, Step 2.3 |
| `0004_add_setlist_tracks` | Denormalised track list within `setlist.state_json` — no schema change, but documented | Phase 2, Step 2.6 |
| `0005_add_stem_parent` | `audio_assets.parent_id` FK for stem-to-source relationships | Phase 3, Step 3.3 |

### 2.3 Storage Configuration (Supabase Storage)

Three storage buckets are required with the following access policies:

| Bucket | Path Pattern | Access Policy | URL Expiry |
| :--- | :--- | :--- | :--- |
| `sonara-audio` | `audio/{userId}/{assetId}.wav` | Private — owner only via RLS | 1 hour |
| `sonara-stems` | `stems/{jobId}/{stemName}.wav` | Private — owner only via RLS | 1 hour |
| `sonara-public` | `avatars/{userId}.png` | Public read, owner write | N/A (permanent URL) |

Pre-signed URL generation occurs in `/api/v1/assets/upload` (PRD §8.2). The Supabase service role key used for pre-signing is a server-side-only secret (see §1.3). The client receives only the pre-signed URL — never the service key.

### 2.4 Upstash Redis — Rate Limiting & Queue

Upstash Redis serves two distinct purposes with separate key namespaces:

**Rate Limiting** — Key pattern: `rl:generate:{userId}` | Window: 3600 s | Max: 10 requests (free tier)

**Job Queue** — Key pattern: `jobs:pending:{jobType}` | FIFO list, consumed by the Railway worker process

Rate limiting uses the Upstash Ratelimit SDK with a sliding window algorithm. The limit is enforced in the Vercel Edge Middleware layer before the request reaches the serverless function, reducing unnecessary function invocations.

---

## 3. CI/CD Pipeline

The pipeline is implemented with GitHub Actions and integrates with Vercel's Git integration for preview deployments. The pipeline enforces quality gates at every stage — no code reaches production without passing all checks.

### 3.1 Pipeline Overview

```
  git push / PR open
       │
       ▼
  ┌────────────┐    FAIL → ✗ block merge
  │  CI Suite  │─────────────────────────────────────────────────────►
  │  (15 min)  │
  └─────┬──────┘
        │ PASS
        ▼
  ┌─────────────────┐    FAIL → ✗ block merge
  │ Preview Deploy  │────────────────────────────────────────────────►
  │ (Vercel + DB    │
  │  branch)        │
  └────────┬────────┘
           │ PASS + PR approved
           ▼
  ┌──────────────────────────────┐
  │  Production Deployment Gate  │
  │  (manual approval required)  │
  └──────────────┬───────────────┘
                 │ approved
                 ▼
  ┌──────────────────────────────┐
  │  Production Deploy           │
  │  1. DB migration (drizzle)   │
  │  2. Vercel deploy (lhr1)     │
  │  3. Smoke tests              │
  │  4. Sentry release tag       │
  └──────────────────────────────┘
```

### 3.2 CI Suite (GitHub Actions — `ci.yml`)

The CI suite runs on every push to any branch and on every pull request targeting `main`. It must complete within 15 minutes.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
  pull_request:
    branches: [main]

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint          # ESLint + Prettier
      - run: npm run type-check    # tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
      # Fail if coverage < 80% on new code (PRD §12.1)
      - run: npx vitest run --coverage --coverage.thresholds.lines=80

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: sonara_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    env:
      DATABASE_URL: postgresql://postgres:test@localhost:5432/sonara_test
      NEXTAUTH_SECRET: test-secret-32-chars-minimum-len
      NEXTAUTH_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx drizzle-kit push:pg   # Apply schema to test DB
      - run: npm run test:integration  # Vitest + MSW

  lighthouse:
    runs-on: ubuntu-latest
    needs: [lint-typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci && npm run build
      - run: npm run start &
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/studio
            http://localhost:3000/dj
          # Fail if Performance < 85 (PRD §12.1)
          budgetPath: ./lighthouse-budget.json
```

### 3.3 Preview Deployment (Vercel Git Integration)

Vercel automatically creates a preview deployment for every pull request. The following additional steps are triggered via a GitHub Actions workflow that runs after Vercel confirms the deployment URL:

1. Apply Drizzle migrations to the Supabase branch database (created automatically per PR via Supabase branching).
2. Run Playwright E2E tests against the live preview URL (critical user journeys from PRD §11.3).
3. Post the preview URL, test results, and Lighthouse scores as a comment on the pull request.
4. Run bundle size analysis and comment if any chunk exceeds 250 KB gzipped.

```yaml
# .github/workflows/preview-e2e.yml
name: Preview E2E

on:
  deployment_status:

jobs:
  e2e:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          PLAYWRIGHT_BASE_URL: ${{ github.event.deployment_status.target_url }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

### 3.4 Production Deployment Gate

Production deployments require an explicit manual approval step from a designated engineer. This is enforced via a GitHub Environment with required reviewers configured on the `production` environment.

| # | Gate | Detail |
| :--- | :--- | :--- |
| 1 | All CI checks pass | `lint-typecheck`, `unit-tests`, `integration-tests`, `lighthouse` all green on the merge commit |
| 2 | PR approved by reviewer | At least one human code review approval required; CODEOWNERS enforced for `src/lib/ai/` |
| 3 | Manual deployment approval | GitHub Environment `production` requires approval from a designated engineer before deploy step runs |
| 4 | Migration review | If a new migration file is present, the approver must confirm they have reviewed the SQL |
| 5 | Post-deploy smoke tests | Automated Playwright smoke test (30 s) verifies `/` and `/studio` return HTTP 200 and the audio engine initialises |
| 6 | Sentry release | A new Sentry release is created and source maps uploaded; alerts are paused for 10 min post-deploy |

### 3.5 Rollback Procedure

Rollback is available at two levels:

**Application rollback:** Instant — redeploy a previous Vercel deployment via the Vercel dashboard or CLI: `vercel rollback [deployment-url]`. Takes under 60 seconds. No code changes required.

**Database rollback:** Manual — requires a prepared rollback migration (see §2.2). Apply via: `npx drizzle-kit push:pg --config drizzle.rollback.config.ts`. Coordinate with application rollback to ensure schema and code are compatible.

> **MIGRATION SAFETY** — Database rollbacks are risky. The safest strategy is to write only additive migrations (add columns, add tables) for as long as possible, avoiding destructive changes until a feature is fully validated in production. Column deletions should be deferred by at least one release cycle.

---

## 4. Cost Model

This section provides a detailed, bottom-up cost projection across three user cohorts. All figures are in USD. Costs are modelled on publicly available pricing as of May 2026 and should be reviewed quarterly. This directly addresses OQ-01 from PRD §13 (Replicate API cost at scale).

### 4.1 Assumptions

| Assumption | Free Tier (100 MAU) | Growth (1,000 MAU) | Scale (10,000 MAU) |
| :--- | :--- | :--- | :--- |
| Daily active users (DAU/MAU ratio) | 40% | 35% | 30% |
| Generation requests per DAU per day | 2 | 3 | 4 |
| Avg generation duration requested | 60 s | 60 s | 60 s |
| MusicGen inference time on Replicate (A100) | ~45 s per 60 s output | ~45 s | ~45 s |
| Stem separation requests per DAU per day | 0.3 | 0.5 | 1.0 |
| Avg track length for separation | 3 min | 3 min | 3 min |
| Demucs inference time on Replicate | ~90 s per 3 min track | ~90 s | ~90 s |
| Storage per user (generated + stems) | 50 MB / month | 100 MB / month | 150 MB / month |
| Mastering requests per DAU per day | 0.1 | 0.2 | 0.3 |

### 4.2 Replicate API Costs

Replicate charges per second of GPU compute. Relevant prices: **MusicGen (A100 80GB): $0.00115/s** | **Demucs (A100 80GB): $0.00115/s**. Cold-start time (~5 s per request) is included in the calculation.

| Cost Driver | 100 MAU / month | 1,000 MAU / month | 10,000 MAU / month |
| :--- | ---: | ---: | ---: |
| MusicGen (generation) | $4.14 | $43.47 | $579.60 |
| Demucs (stem separation) | $0.93 | $12.42 | $248.40 |
| Mastering (server-side FFmpeg — no GPU cost) | $0.00 | $0.00 | $0.00 |
| Replicate cold-start overhead (~5s per request) | $0.35 | $3.68 | $49.10 |
| **Total Replicate** | **$5.42** | **$59.57** | **$877.10** |

### 4.3 Infrastructure Costs

| Service | Plan / SKU | 100 MAU | 1,000 MAU | 10,000 MAU |
| :--- | :--- | ---: | ---: | ---: |
| Vercel | Hobby → Pro → Pro | $0 | $20 | $20 |
| Vercel Serverless — additional compute | Included in Pro / overages | $0 | $0 | ~$30 |
| Supabase (database) | Free → Pro → Pro | $0 | $25 | $25 |
| Supabase Storage | $0.021/GB/month | $0.10 | $2.10 | $31.50 |
| Supabase Egress (audio streaming) | $0.09/GB | $1.80 | $27.00 | $270.00 |
| Upstash Redis | Free → Pay-per-use | $0 | $3 | $15 |
| Sentry | Developer → Team | $0 | $26 | $26 |
| **Total Infrastructure** | | **$1.90** | **$103.10** | **$417.50** |

### 4.4 Total Monthly Cost Summary

| Category | 100 MAU | 1,000 MAU | 10,000 MAU |
| :--- | ---: | ---: | ---: |
| Replicate AI compute | $5.42 | $59.57 | $877.10 |
| Infrastructure (hosting, DB, storage, egress) | $1.90 | $103.10 | $417.50 |
| Contingency (15%) | $1.10 | $24.40 | $194.20 |
| **Total estimated monthly cost** | **$8.42** | **$187.07** | **$1,488.80** |
| **Cost per MAU** | **$0.08** | **$0.19** | **$0.15** |

### 4.5 Cost Optimisation Levers

The following optimisations should be evaluated in priority order as user volume grows, directly addressing OQ-01 from PRD §13:

| P | Lever | Mechanism | Saving Est. | Trigger Point |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Replicate prediction caching | Cache generation outputs by `(prompt_hash + params)`. Near-identical prompts return cached audio. Store in Supabase Storage + DB lookup. | 15–25% | Any volume |
| 2 | Rate limiting enforcement | 10 generations/hr per free user (already in NFR-SEC-04). Prevents runaway cost from power users on free tier. | Up to 40% | Day 1 |
| 3 | Self-host Demucs on RunPod | Deploy `htdemucs` on a RunPod GPU pod ($0.44/hr for A100). Break-even vs Replicate at ~380 separation requests/day. | ~60% on separation | >500 MAU |
| 4 | MusicGen model downgrade | Switch from A100 to A40 for shorter clips (30 s). A40 cost: ~$0.000725/s. Quality acceptable for loop generation. | ~37% on generation | If quality permits |
| 5 | Audio CDN for egress | Route audio streaming through Cloudflare R2 (free egress). Eliminates Supabase egress cost ($0.09/GB). | ~$270/month at scale | >2,000 MAU |
| 6 | Freemium conversion | Free tier: 5 generations/day. Paid tier (£9.99/month): unlimited. Revenue offsets AI compute cost. | Break-even analysis below | >1,000 MAU |

### 4.6 Break-Even Analysis (Freemium Model)

Assuming a paid tier at £9.99/month (~$12.60 USD) and a free-to-paid conversion rate of 5% (industry standard for developer tools):

| Metric | 100 MAU | 1,000 MAU | 10,000 MAU |
| :--- | ---: | ---: | ---: |
| Paid users (5% conversion) | 5 | 50 | 500 |
| Monthly revenue (@ $12.60) | $63 | $630 | $6,300 |
| Total monthly cost (from §4.4) | $8.42 | $187.07 | $1,488.80 |
| **Net margin** | **+$54.58** | **+$442.93** | **+$4,811.20** |
| **Cost coverage** | **748%** | **337%** | **423%** |

> **KEY FINDING** — Even at 100 MAU with only 5 paying users, the product is profitable. The primary financial risk is not infrastructure cost but the cost of uncontrolled AI compute usage by free-tier users. Rate limiting (NFR-SEC-04) is therefore not just a security measure — it is the single most important cost control in the system.

---

## 5. Monitoring & Observability

Observability is defined across three dimensions: errors, performance, and business metrics. This satisfies PRD §9.3 (Reliability) and §12.1 (Technical Metrics).

### 5.1 Error Monitoring (Sentry)

Sentry is configured with source maps for meaningful stack traces. The following alert rules must be configured on day one of production deployment:

| Alert | Condition | Threshold | Action |
| :--- | :--- | :--- | :--- |
| AI generation error rate | Errors on `/api/v1/generate` > X% of requests | >5% in 5 min | PagerDuty / Slack |
| Unhandled client exception spike | New error event volume > baseline | >50 events/5 min | Slack |
| Job stuck in processing | `generation_jobs.status='processing'` for >5 min | Any occurrence | Slack + auto-retry |
| Database connection exhaustion | Supabase connection pool >80% utilised | >80% for 2 min | Slack |
| API p95 latency | `/api/v1/*` p95 response time | >3,000 ms for 5 min | Slack |

### 5.2 Business Metrics Dashboard

A lightweight Supabase-backed dashboard (or Metabase connected to Supabase) must track the following metrics to validate PRD §12 success criteria:

- **Daily generation count** — total jobs created, split by status (complete / failed / pending)
- **Time to first generated track** — p50 and p95 of job duration for `type='generate'`. Target: under 90 s (PRD §12.2)
- **Stem separation completion time** — p50 and p95 of job duration for `type='separate'`. Target: under 120 s
- **Daily active users** — unique `user_id`s with any activity in 24 h
- **Replicate spend (daily)** — queried from Replicate billing API, plotted with budget alert at 80% of monthly cap
- **Error rate per session** — Sentry sessions with ≥1 error / total sessions. Target: <5% (PRD §12.2)

---

## 6. Security Architecture

This section provides implementation detail for all NFR-SEC requirements from PRD §9.2. Each control is mapped to the specific code location where it must be implemented.

| Req | Control | Implementation | Test |
| :--- | :--- | :--- | :--- |
| NFR-SEC-01 | API key isolation | All Replicate/Supabase keys in server-only env vars. Next.js 15 server components and API routes only. Middleware blocks any client access to `/api/v1/*` without a valid session JWT. | Automated: `grep` codebase for `REPLICATE_API_TOKEN` in client-side files — must return 0 results. |
| NFR-SEC-02 | Input validation with Zod | Every API route defines a Zod schema. Parse with `schema.safeParse(body)` before any DB operation. Return `400` with `{ error, code }` on failure. | Unit test: POST with malformed body → assert 400 response with correct error shape. |
| NFR-SEC-03 | File upload safety | Pre-signed URL endpoint validates: MIME type in `(audio/wav, audio/mpeg, audio/ogg)`, file size ≤ 50 MB. Supabase Storage bucket policy enforces the same constraints server-side. | Integration test: upload a >50 MB file → assert 413 rejection. |
| NFR-SEC-04 | Rate limiting | Upstash Ratelimit SDK in Edge Middleware. Sliding window: 10 generation requests per user per hour. Return `429` with `Retry-After` header on breach. | E2E test: submit 11 generation requests in sequence → assert 11th returns 429. |
| NFR-SEC-05 | CSRF protection | NextAuth.js handles CSRF token rotation on all auth endpoints automatically. Non-auth POST routes require the `Authorization` header (bearer token), which browsers cannot set cross-origin without CORS preflight. | Manual penetration test before launch. |
| NFR-SEC-06 | Webhook signature verification | Replicate webhook handler at `/api/v1/webhooks/replicate` verifies the request signature using `REPLICATE_WEBHOOK_SECRET`. Reject unsigned requests with 401. | Unit test: POST without valid signature → 401. |

---

## 7. Local Development Setup

Every engineer must be able to run the full application stack locally without access to production resources. The following Docker Compose configuration provides local equivalents of all external services.

```yaml
# docker-compose.dev.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: sonara
      POSTGRES_DB: sonara_dev
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  storage:  # MinIO as local S3-compatible storage
    image: minio/minio
    command: server /data --console-address ':9001'
    environment:
      MINIO_ROOT_USER: sonara
      MINIO_ROOT_PASSWORD: sonara123
    ports: ['9000:9000', '9001:9001']
    volumes: ['miniodata:/data']

  # Replicate is not emulated locally — use client AI mock by default (`NEXT_PUBLIC_AI_GENERATE_BACKEND=mock`)

volumes:
  pgdata:
  miniodata:
```

New developer onboarding checklist:

1. **Clone & install:** `git clone ... && npm install`
2. **Start services:** `docker compose -f docker-compose.dev.yml up -d`
3. **Copy env template:** `cp .env.example .env.local` and fill in the local values
4. **Apply schema:** `npm run db:migrate` (applies SQL in `drizzle/`) or `npm run db:push` for schema sync without migration files
5. **Run dev server:** `npm run dev` — application available at `http://localhost:3000`
6. **Verify AI defaults:** With `NEXT_PUBLIC_AI_GENERATE_BACKEND=mock` (default), Studio generation stays on the in-browser procedural mock. For live Replicate generation see §8.

---

## 8. Phase 4 — Server generation

Production path for **text-to-music** uses **Stable Audio Open** on **Replicate** (`stability-ai/stable-audio-open-1.0`, version pinned via `REPLICATE_STABLE_AUDIO_VERSION`). Async contract:

| Step | Endpoint |
| :--- | :--- |
| Queue | `POST /api/v1/generate` → `202 { job_id }` |
| Callback | `POST /api/v1/webhooks/replicate` (Svix-style signed webhook) |
| Poll | `GET /api/v1/jobs/:id` → `{ status, audioUrl? }` |

**Env:** `AI_PROVIDER=replicate`, `REPLICATE_API_TOKEN`, `REPLICATE_STABLE_AUDIO_VERSION`, `REPLICATE_WEBHOOK_SIGNING_SECRET`, `DATABASE_URL`, optional `SUPABASE_*` to re-host WAVs. **Studio:** set `NEXT_PUBLIC_AI_GENERATE_BACKEND=server` so the client probes `/api/v1/ai/capabilities` and uses the server route when `generateBackend === "replicate"`.

---

## Document Control

| Version | Date | Author | Change |
| :--- | :--- | :--- | :--- |
| 1.0 | 3 May 2026 | Claude (Anthropic) | Initial release — complements Sonara PRD v1.0 |
| 1.2 | 16 May 2026 | Cursor | §8 Phase 4 server generation + checklist env rename |

This document is a companion to **Sonara PRD v1.0**. All section cross-references (§) refer to the PRD. Both documents should be versioned together. Questions or updates: raise a GitHub issue tagged `docs`.
