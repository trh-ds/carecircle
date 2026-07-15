# CodeSense — CareCircle

> **Purpose**: the single source of truth for how code is written, reviewed, and deployed in this project. Every violation is a bug. Every decision traces to a named standard below.
>
> **Sources**: backend-cloud · system-arch-devops · frontend-motion · gsap-react · verifier · GUIDE.md §0 ("write your own design before code exists").

---

## 0. The Prime Directives

1. **Read GUIDE.md §0 before touching anything.** If you can't explain the piece you're about to build in your own words, stop — you're not ready to write it.
2. **Every endpoint has auth.** No exceptions. Even internal health checks require at minimum a no-op auth gate for audit.
3. **Never leak internal state to the client.** No stack traces in responses. No raw `err` in JSON. No password/secret in any response body, ever.
4. **Validation at the boundary, not in the handler.** Request bodies are validated before they reach business logic. Always.
5. **Structured logging only.** `console.log` does not exist in production. Every log line carries `traceId`, `level`, `service`, `timestamp`.

---

## 1. Stack & Dependency Policy

### Boring-by-default. Every dependency earns its place.

| Concern | Choice | Rationale |
|---|---|---|
| Runtime | Next.js 16 (App Router) | `src/app/`, React 19, React Compiler enabled |
| Language | TypeScript 5, `strict: true` | No `any` escapes code review |
| CSS | Tailwind 4 | `@import "tailwindcss"`, no config file, utility-first |
| Class merging | `clsx` + `tailwind-merge` | One `cn()` helper; no raw string concatenation |
| DB driver | Postgres (`postgres` package) | Already in `package.json`; `pgvector` for RAG; no ORM |
| Auth (JWT) | `jose` | Replace `jsonwebtoken` — `jose` is Web Crypto-native, faster, Edge-compatible |
| Passwords | `bcryptjs` | Cost factor 12 (up from 10) |
| Validation | `zod` | Every route handler's first line: `schema.parse(await req.json())` |
| Logging | `pino` | Structured JSON; `console.log` is a lint error |
| Testing | `vitest` | Fast, native ESM, compatible with Next.js |
| E2E | `playwright` | Real browser, not jsdom |
| Animation | `framer-motion` for components, `gsap` + `@gsap/react` for scroll timelines | `@gsap/react` provides `useGSAP()` hook with auto-cleanup |
| CI | GitHub Actions | Lint → type-check → test → build → push image |

### What we don't add (yet)

No ORM (Prisma/Drizzle), no tRPC, no state management library (React context + server components cover it), no Supabase (GUIDE says self-hosted Postgres, not BaaS), no separate vector DB (pgvector is in Postgres).

---

## 2. Directory Structure

```
apps/web/
  src/
    app/                        ← Next.js App Router
      (auth)/                   ← Route group: unauthenticated pages
        login/page.tsx
        signup/page.tsx
      (dashboard)/              ← Route group: authenticated pages
        layout.tsx              ← Auth gate lives here — one place
        page.tsx
        circles/
          [circleId]/
            page.tsx
            members/page.tsx
      api/v1/                   ← API routes, versioned from day one
        auth/
          login/route.ts
          register/route.ts
          logout/route.ts
          refresh/route.ts
        circles/
          route.ts              ← GET (list), POST (create)
          [circleId]/
            route.ts            ← GET, PATCH, DELETE
            members/route.ts
        health/
          live/route.ts
          ready/route.ts
    components/                  ← Shared UI components
      ui/                        ← Primitives: Button, Input, Card, Modal
      layout/                    ← Shell, Sidebar, Header
      circles/                   ← Domain components
    lib/                         ← Infrastructure (no React imports)
      db.ts                      ← Postgres pool (one file, one pool)
      auth.ts                    ← signToken, verifyToken, refreshToken
      password.ts                ← hash, verify
      rate-limit.ts              ← Token-bucket rate limiter
      logger.ts                  ← Pino instance, request-context helpers
      cn.ts                      ← clsx + tailwind-merge
      idempotency.ts             ← Idempotency-key store + middleware
    hooks/                       ← Shared React hooks
      use-auth.ts
      use-circle.ts
    types/                       ← Shared interfaces, Zod schemas
      index.ts
    validators/                  ← Zod schemas (one file per resource)
      auth.ts
      circle.ts
      medication.ts
```

### File naming

| Kind | Convention | Example |
|---|---|---|
| Components | PascalCase | `ExpandableCard.tsx` |
| Hooks | `use-*.ts` | `use-scroll-reveal.ts` |
| Lib files | kebab-case | `rate-limit.ts` |
| Type files | kebab-case | `circle.ts` |
| Route handlers | `route.ts` (Next.js convention) | — |

---

## 3. TypeScript Rules

```ts
// ✅ Explicit return types on all exported functions
export async function verifyToken(token: string): Promise<JWTPayload> { ... }

// ✅ type for unions/mapped types, interface for objects that grow
interface User { id: string; email: string; }
type Role = 'coordinator' | 'recipient' | 'caregiver' | 'professional_viewer';

// ✅ Readonly on function params that shouldn't mutate
function processCircle(readonly circle: Circle): DashboardData { ... }

// ❌ No any — use unknown + type guard
// ❌ No enums — use const objects with `as const`
// ❌ No namespace — use ES modules
// ❌ No default exports except where Next.js requires it (page.tsx, route.ts, layout.tsx)
```

---

## 4. Imports

```ts
// ✅ Order: third-party → internal lib → internal helpers → types → styles
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { CircleSchema } from '@/validators/circle';
import type { Circle } from '@/types';

// ✅ @/* alias always, never relative paths
import { cn } from '@/lib/cn';    // ✅
import { cn } from '../../../lib/cn';  // ❌
```

---

## 5. API Design

### 5.1 URL shape

```
/api/v1/circles/{circleId}/members
/api/v1/circles/{circleId}/medications
/api/v1/circles/{circleId}/documents
/api/v1/circles/{circleId}/check-ins
```

The tenant boundary (`circleId`) is in the URL, not inferred from the token. Every handler cross-checks: does the authenticated user belong to this circle?

### 5.2 Response envelope

**Every response — success or error — has the same shape:**

```ts
// Success
{
  "data": <T>,
  "meta": { "requestId": "uuid" }
}

// Error
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",       // Machine-readable, UPPER_SNAKE
    "message": "Circle not found",       // Human-readable, one sentence
    "details": {}                         // Optional: field-level validation errors
  },
  "meta": { "requestId": "uuid" }
}

// Paginated
{
  "data": [...],
  "meta": {
    "requestId": "uuid",
    "cursor": "abc123",      // Cursor-based, never offset
    "hasMore": true
  }
}
```

### 5.3 Error codes

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Zod parse fails |
| `UNAUTHENTICATED` | 401 | Missing/expired/invalid token |
| `UNAUTHORIZED` | 403 | Authenticated but wrong role for this action |
| `RESOURCE_NOT_FOUND` | 404 | Circle/user/document doesn't exist or you don't have access |
| `CONFLICT` | 409 | Duplicate email, duplicate membership |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected failure — never expose the cause to client |

### 5.4 Route handler template

```ts
// src/app/api/v1/circles/[circleId]/members/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { AddMemberSchema } from '@/validators/circle';
import { requestId } from '@/lib/request-id';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const rid = requestId();

  // 1. Auth
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Sign in required' }, meta: { requestId: rid } },
      { status: 401 }
    );
  }

  // 2. Parse + validate body (Zod strips unknown fields)
  const body = AddMemberSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: body.error.flatten() }, meta: { requestId: rid } },
      { status: 422 }
    );
  }

  const { circleId } = await params;

  // 3. Authorization: is the caller a coordinator of this circle?
  const membership = await getMembership(session.userId, circleId);
  if (!membership || membership.role !== 'coordinator') {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Only coordinators can add members' }, meta: { requestId: rid } },
      { status: 403 }
    );
  }

  // 4. Business logic
  try {
    await db`
      INSERT INTO circle_members (circle_id, user_id, role, joined_at)
      VALUES (${circleId}, ${body.data.userId}, ${body.data.role}, NOW())
    `;
    logger.info({ circleId, addedUserId: body.data.userId, role: body.data.role, traceId: rid }, 'Member added to circle');
    return NextResponse.json(
      { data: { circleId, userId: body.data.userId, role: body.data.role }, meta: { requestId: rid } },
      { status: 201 }
    );
  } catch (err) {
    logger.error({ err, circleId, traceId: rid }, 'Failed to add member');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }, meta: { requestId: rid } },
      { status: 500 }
    );
  }
}
```

### 5.5 Headers

Every response carries:
- `X-Request-ID` — traces a request across services
- `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `Retry-After` — on rate-limited endpoints

### 5.6 Idempotency

All `POST`, `PATCH`, `PUT` endpoints accept an optional `Idempotency-Key` header. If the key has been seen before (within 24h), replay the cached response without re-executing the mutation:

```ts
// src/lib/idempotency.ts — sketched, implement in Phase 1
export function withIdempotency(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const key = req.headers.get('idempotency-key');
    if (!key) return handler(req, ctx);
    // Check Redis for cached response, return if found
    // Execute handler, cache response in Redis (24h TTL), return
  };
}
```

---

## 6. Validation (Zod)

Schemas live in `src/validators/`, one file per resource. Co-locate the schema with the route that uses it — if two routes share a schema, extract it.

```ts
// src/validators/circle.ts
import { z } from 'zod';

export const CreateCircleSchema = z.object({
  name: z.string().min(2).max(100),
  recipientName: z.string().min(2).max(100),
});

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['coordinator', 'recipient', 'caregiver', 'professional_viewer']),
});

export type CreateCircleInput = z.infer<typeof CreateCircleSchema>;
```

**Rule**: Zod schemas are the source of truth for request shape. TypeScript types for the domain model live in `src/types/`. The validator layer translates between them — the handler never sees a raw `any` body.

---

## 7. Authentication & Authorization

### 7.1 Token architecture

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access token | 15 minutes | `httpOnly` cookie (`__Host-access`) | Authenticates API requests |
| Refresh token | 7 days | `httpOnly` cookie (`__Host-refresh`), `path=/api/v1/auth/refresh` | Issues new access tokens |

- Use `jose`, not `jsonwebtoken`. `jose` is Web Crypto-native, Edge-compatible, and faster.
- Cookie prefix `__Host-` enforces Secure + Path=/ + no Domain attribute (browser-enforced CSRF protection).
- Refresh rotation: each use invalidates the old refresh token and issues a new one. Detects token theft.

```ts
// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();
const secret = encoder.encode(process.env.JWT_SECRET!); // Must crash at startup if missing

export async function signAccessToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<{ userId: string; email: string; jti: string }> {
  const { payload } = await jwtVerify(token, secret);
  // Check Redis for revoked jti
  const revoked = await redis.get(`revoked:${payload.jti}`);
  if (revoked) throw new Error('Token revoked');
  return { userId: payload.sub!, email: payload.email as string, jti: payload.jti as string };
}
```

### 7.2 RBAC

Roles are properties of Circle membership, not global user attributes. Permission checks are always scoped: "is this user a coordinator *of this circle*?"

```ts
const CIRCLE_PERMISSIONS = {
  coordinator:  ['manage_members', 'manage_tasks', 'view_all_documents', 'view_financial', 'delete_circle'],
  recipient:    ['view_own_data', 'log_check_in', 'trigger_sos'],
  caregiver:    ['log_medication', 'log_check_in', 'trigger_sos'],
  professional_viewer: ['view_shared_documents'],
} as const;

type CircleRole = keyof typeof CIRCLE_PERMISSIONS;
type CirclePermission = typeof CIRCLE_PERMISSIONS[CircleRole][number];

export function can(role: CircleRole, permission: CirclePermission): boolean {
  return (CIRCLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}
```

### 7.3 Row-Level Security (Postgres)

RLS policies make the database itself refuse to return rows for circles the requesting user doesn't belong to. Defense in depth — a bug in app code doesn't leak cross-circle data.

```sql
-- Executed per-request via SET LOCAL
CREATE POLICY circle_isolation ON documents
  FOR SELECT
  USING (circle_id = current_setting('app.current_circle_id')::uuid);
```

---

## 8. Database

### 8.1 Postgres, not MySQL

The GUIDE specifies Postgres + `pgvector` for RAG. `postgres` package is already in `package.json`. One pool, one file:

```ts
// src/lib/db.ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export { sql as db };
```

### 8.2 Query style

```ts
// ✅ Tagged template literals (postgres package)
const rows = await db`SELECT * FROM circles WHERE id = ${circleId}`;

// ✅ Parameterized — never string interpolation
// ❌ await db(`SELECT * FROM circles WHERE id = '${circleId}'`);
```

### 8.3 Migrations

Use `postgres` package's built-in migration support or a dedicated tool (e.g., `node-pg-migrate`). All migrations are:

- **Forward-only** (no rollback scripts — roll forward instead)
- **Expand-contract pattern**: add column → backfill → remove old column across three deploys
- **Stored in `migrations/`**, versioned with the code

### 8.4 Audit columns

Every table that holds sensitive data:
```sql
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by  UUID REFERENCES users(id),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
deleted_at  TIMESTAMPTZ,  -- soft delete
```

---

## 9. Logging (Pino)

```ts
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'carecircle-web',
    env: process.env.NODE_ENV,
  },
  redact: ['password', 'token', 'secret', 'authorization'],
});
```

**Rules**:
- `logger.info({ userId, circleId, traceId }, 'Message')` — context first, then message.
- `console.log` is a lint error in production code.
- Every log line must carry `traceId` (from `X-Request-ID` header).

---

## 10. Frontend Conventions

### 10.1 Component structure

```tsx
// ✅ Minimal, named exports
'use client'; // Only when needed — server components by default

import { useRef } from 'react';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface ExpandableCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ExpandableCard({ title, children, className }: ExpandableCardProps) {
  return (
    <div className={cn('rounded-2xl bg-white p-6 shadow-sm', className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </div>
  );
}
```

### 10.2 `cn()` helper

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 10.3 Client vs. Server components

- **Default**: server component. No `'use client'` unless you need interactivity.
- **Auth gate**: in `(dashboard)/layout.tsx` — a server component that reads cookies, verifies the session, and redirects to `/login` if missing. One place, not scattered across pages.
- **Client components**: only for interactivity (forms, buttons, modals, animations). Never fetch data in a client component — pass data as props from a server parent.

### 10.4 Animation rules

From **gsap-react** and **frontend-motion**:

```tsx
// ✅ useGSAP for GSAP animations
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export function StaggerReveal({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from('.reveal-item', {
      opacity: 0,
      y: 40,
      duration: 0.8,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: container.current, start: 'top 85%' },
    });
  }, { scope: container });

  return <div ref={container}>{children}</div>;
}
```

- Animate `transform` and `opacity` only. No `height`, `width`, `top`, `left` in animations.
- Reduced motion: `prefers-reduced-motion` respected in every animation.
- GSAP contexts always cleaned up via `useGSAP` auto-revert or `ctx.revert()` in `useEffect` return.

### 10.5 Design tokens

Tailwind 4 with `@theme` for project-specific tokens. Define once in `globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --color-primary-foreground: #ffffff;
  --color-muted: #f3f4f6;
  --color-muted-foreground: #6b7280;
  --color-destructive: #ef4444;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

---

## 11. Testing

### 11.1 Test runner: Vitest

```bash
npm install -D vitest @vitejs/plugin-react
```

### 11.2 Three-tier protocol (from verifier)

For every API endpoint:
1. **Happy path** — correct input → correct output shape + status
2. **Failure modes** — missing auth, bad token, expired token, missing fields, invalid types, SQL injection attempt → correct error code + no 500
3. **Performance** — response < 200ms for simple queries, < 500ms for aggregates

### 11.3 Test structure

```ts
// src/__tests__/api/circles.test.ts
import { describe, it, expect } from 'vitest';

describe('POST /api/v1/circles', () => {
  it('returns 201 with circle data on valid input');
  it('returns 401 without auth token');
  it('returns 401 with expired token');
  it('returns 422 with missing name');
  it('returns 422 with name shorter than 2 chars');
  it('handles SQL injection in name field gracefully');
});

describe('GET /api/v1/circles', () => {
  it('returns only circles the user belongs to (tenant isolation)');
});
```

---

## 12. Security

| Rule | Enforcement |
|---|---|
| No secrets in code | `.env.local` is `.gitignore`d; `process.env.JWT_SECRET!` crashes at startup if missing |
| No raw errors to client | `INTERNAL_ERROR` code, details logged server-side only |
| SQL injection prevention | Parameterized queries (tagged templates) — never string interpolation |
| CSRF | `__Host-` cookie prefix; SameSite=Strict |
| Rate limiting | Token bucket per-circle on agent-calling endpoints; per-IP on auth endpoints |
| Input validation | Zod at the boundary — reject unknown fields, no raw `any` |
| XSS prevention | React's built-in escaping; never `dangerouslySetInnerHTML` without DOMPurify |
| CORS | Allowlist specific origins, never `*` |

---

## 13. Environment & Config

```bash
# .env.example — committed, documents every variable
DATABASE_URL=postgres://user:pass@localhost:5432/carecircle
JWT_SECRET=           # generate: openssl rand -hex 64
REDIS_URL=redis://localhost:6379
LLM_PROVIDER=         # anthropic | groq | gemini
LLM_API_KEY=
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
LOG_LEVEL=info
```

- **`.env.local` is `.gitignore`d.** Never committed.
- **`config.ts` at startup** validates all required env vars with Zod and crashes fast if any are missing — no runtime fallbacks.
- **`JWT_SECRET` fallback to `'your-secret-key'`** is a security bug. Remove it. Crash if missing.

---

## 14. Health Checks

```ts
// src/app/api/v1/health/live/route.ts
export async function GET() {
  return NextResponse.json({ status: 'alive' });
}

// src/app/api/v1/health/ready/route.ts
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    await db`SELECT 1`;
    return NextResponse.json({ status: 'ready', checks: { database: 'ok' } });
  } catch {
    logger.error('Health check failed: database unreachable');
    return NextResponse.json({ status: 'not ready', checks: { database: 'error' } }, { status: 503 });
  }
}
```

---

## 15. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    needs: [lint, type-check]
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_DB: carecircle_test, POSTGRES_PASSWORD: test }
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx vitest run --coverage
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/carecircle_test

  build:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker build -t carecircle-web:${{ github.sha }} .
```

---

## 16. Git Hygiene

- **Branch**: `feature/description`, `fix/description`, `chore/description`
- **Commit messages**: conventional commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- **No merge commits on feature branches** — rebase onto `main`
- **PRs require**: lint pass, type-check pass, test pass, one review
- **`.env.local` is `.gitignore`d** — audit with `git ls-files | grep .env` before every push

---

## 17. What to Fix Now (Priority-ordered)

| # | Issue | Action |
|---|---|---|
| 1 | `.env.local` committed with real Supabase keys | Rotate keys immediately. `git rm --cached apps/web/.env.local`. Add `.env.local` to root `.gitignore`. |
| 2 | `JWT_SECRET` fallback to `'your-secret-key'` | Remove fallback. Crash at startup if `JWT_SECRET` is missing. |
| 3 | MySQL instead of Postgres | Replace `mysql2` pool with `postgres` package. Both are in `package.json` — swap. |
| 4 | `jsonwebtoken` → `jose` | `jose` is Edge-compatible, Web Crypto-native, modern. |
| 5 | No Zod validation on any route | Add Zod schemas in `src/validators/` and parse in every route handler. |
| 6 | Raw `err` in API response body | Replace with `INTERNAL_ERROR` code; log the real error server-side. |
| 7 | Debug call at module scope | Remove `getUserName('cf448052-...')` at bottom of `getUserById.ts`. |
| 8 | No `cn()` helper | Install `clsx` + `tailwind-merge`, add `src/lib/cn.ts`. |
| 9 | No structured logging | Install `pino`, add `src/lib/logger.ts`, replace all `console.log`. |
| 10 | No test runner | Install `vitest`, write one test for the existing `join-circle` route. |

---

## 18. Checklist for Every PR

```
[ ] Every new API route has Zod validation
[ ] Every route handler starts with getSession()
[ ] Response shape follows { data, meta } or { error, meta } envelope
[ ] Error codes are UPPER_SNAKE, not raw strings
[ ] No console.log — all logging via logger.{info,warn,error}
[ ] No .env files in the diff
[ ] No secrets, keys, or tokens in the diff
[ ] Types exported, not default-exported (except Next.js pages/routes)
[ ] Tests cover: happy path + auth failure + validation failure
[ ] Animation respects prefers-reduced-motion
```
