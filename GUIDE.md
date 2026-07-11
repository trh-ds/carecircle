# CareCircle — Project Guide
### An open-source, agentic care-coordination platform for distributed families

*Working title — rename freely, nothing below depends on it. "Kutumb" (Hindi/Sanskrit for family) or "Setu" (bridge) are alternatives if you want the branding to lean into the India/NRI angle.*

---

## Contents

0. How to use this document
1. The problem, and where the gap actually is
2. Non-negotiable boundaries
3. Users and roles
4. Core user journeys
5. Feature scope
6. System architecture overview
7. Backend concepts to master
8. Agentic AI architecture
9. DevOps roadmap
10. Data model sketch
11. Privacy, security & compliance
12. Suggested tech stack
13. Build phases
14. Open-source practices
15. Success criteria
16. Per-phase research checklist
17. Rebuilding your engineering judgment while you build this

---

## 0. How to use this document

This is a concept-only guide: architecture, patterns, and things to research — zero code, on purpose. The point isn't to hand you a spec to implement mechanically. It's to be the thing you argue with while you design.

Before you open any AI coding assistant on a given part of this system — the schema, the cache-invalidation logic, the agent orchestration graph, an RLS policy — write out, in your own words, on paper or in a scratch doc, what you're about to build and why. Then use the assistant to scaffold it. If you can't explain a piece of your own system out loud without looking at the code, that's the signal to slow down on that part, not to generate more of it. The document is structured so you can do that section by section.

---

## 1. The problem, and where the gap actually is

**The pain point is real and measurable.** Long-distance caregiving — coordinating an aging or unwell relative's care from another city or country — affects roughly 11% of family caregivers, and most of them report feeling unprepared for it. It shows up as: nobody has a shared view of whether Dad took his evening dose, three siblings all assume someone else booked the cardiologist follow-up, and the one lab report that actually mattered is buried in a WhatsApp chat from six weeks ago.

**Be honest about the landscape before you build in it.** "Elder care" as a category is not a gap — it's a funded, competitive market. In India specifically, Emoha has raised over $16M and serves 100,000+ users across 120+ cities; Samarth serves 30,000+ elders across 110+ cities; Tracxn tracks roughly 30 active competitors in Indian elder care, nine of them funded (Emoha, Samarth, KITES, LifeCircle, Tribeca Care, Yodda, and others). All of them sell essentially the same thing at the core: a subscription bundle of human caregivers, nurses, and emergency response. That's a legitimate, valuable business — it's just not software, and it's not open.

**The actual seam.** On the open-source side, the closest project is Fasten Health — a self-hosted personal/family medical-record aggregator — but it's built around clinical interoperability standards (FHIR), not day-to-day coordination or an agent that actively organizes and flags things. On the professional side, tools like WellSky, Nourish, and ShiftCare exist for paid care agencies to run their operations, not for an unpaid family circle coordinating itself. Nobody occupies the specific position of: an open-source, self-hostable, agent-native coordination layer that sits on top of whatever care arrangement a family already has — a paid service like Emoha, a local nurse, a domestic helper, or just siblings splitting duties — and does the remembering, flagging, and summarizing that currently falls on one exhausted family member.

That's what CareCircle is.

---

## 2. Non-negotiable boundaries

Get this wrong and the project either becomes legally/ethically risky or just a worse version of an EHR. Two rules, enforced at the architecture level, not just in UI copy:

- **This is a coordination and organization tool, never a diagnostic one.** Agents structure, summarize, and flag patterns in data the family already has. They never interpret what a lab value *means* clinically, never suggest a dosage change, and every health-adjacent flag closes with a pointer back to a real doctor. Build this as a hard constraint in agent prompts and in your eval set (§8.5), not as a disclaimer.
- **Privacy is a first-class architectural concern from day one**, not a checkbox added before launch. You're handling family health-adjacent data; treat every design decision — who can query what, what gets logged, what gets encrypted — as if a regulator or a worried parent will ask you to justify it, because eventually, one will.

---

## 3. Users and roles

A **Circle** is the tenant boundary — one family. Roles are a property of membership *in a specific circle*, not a global user attribute:

- **Coordinator** — usually the distant adult child; full read/write access, manages membership and the vendor/task board.
- **Recipient** — the person being cared for; can view their own data, log check-ins, optionally has a simplified voice/WhatsApp-style interface (§5).
- **Caregiver** — local helper, domestic staff, or nurse; scoped access (can log check-ins and doses, can't see financial notes or manage membership).
- **Professional viewer** — a doctor or physiotherapist given a narrow, read-only, consent-gated link into relevant records for a visit. Not a full account.

---

## 4. Core user journeys

Sketch these before touching architecture — they're what the API and data model actually need to support:

1. **Onboarding** — a coordinator creates a Circle, invites a sibling as co-coordinator and a local caregiver, and adds their mother as the recipient.
2. **Daily loop** — the caregiver logs that morning medication was taken and blood pressure was checked; the recipient (or caregiver on her behalf) does a 30-second check-in.
3. **Document ingestion** — a lab report photo is uploaded; the Document Intelligence Agent extracts date, test, key values, and doctor's name into the timeline without anyone typing it in.
4. **The weekly digest** — Sunday morning, every Circle member gets a short, calm summary: adherence rate, what's coming up, anything that looks off and should be raised at the next doctor visit.
5. **Coordination** — the Coordinator posts "need someone to take Mom to the dentist Thursday" to the task board; the Coordination Agent checks who's marked available and drafts the ask.
6. **Emergency** — the recipient or caregiver hits an SOS control; every Circle member is alerted immediately, with the recipient's key info (allergies, current meds, emergency contact) surfaced instantly.

---

## 5. Feature scope

### MVP — build this first, resist adding more
1. Circle creation & role-based membership
2. Medication & appointment tracker with reminders
3. Document locker with OCR ingestion → structured timeline
4. Daily check-in log
5. Weekly family digest (agentic)
6. Task/vendor coordination board
7. Emergency/SOS alert flow

### Phase 2 — don't start until the MVP loop actually works end to end
- **Vetted local caregiver/vendor marketplace** — also your monetization lever if you ever want a hosted, open-core version
- **WhatsApp/voice interface for the recipient** — a caregiver or elderly parent just messages naturally ("BP checked, 140/90, doctor said continue current dose") and a Conversational Intake Agent extracts structured data behind the scenes. Directly reusable from your existing WhatsApp/Groq bot work.
- **Wearable integration** (steps, heart rate)
- **Insurance-claim assist** — compiling the Circle's own documents into a claim-ready packet
- **Multi-language support** — genuinely important given many recipients will be more comfortable in Hindi or a regional language than English

---

## 6. System architecture overview

Two services you write, sitting on shared/managed infrastructure:

- **Next.js app** — the web UI and the "backend for frontend" (BFF): conventional CRUD API routes for circles, members, medications, documents, check-ins, tasks. This is where a request from a browser lands first, after the load balancer.
- **Agent service (Python, FastAPI + LangGraph)** — everything agentic: document intelligence, adherence analysis, the weekly digest, coordination help. The Next.js layer calls into this service over an internal API when it needs agent work done; it never talks to an LLM provider directly.

Both sit in front of the same data layer: **PostgreSQL** (with the `pgvector` extension for the RAG index, so you're not standing up a separate vector database on day one) and **Redis**, which earns its place at almost every layer — cache, session store, rate-limit counters, and the queue broker for background jobs. **Object storage** (S3 or equivalent) holds the actual document files; Postgres holds metadata and extracted text.

A small **worker pool** (Celery or RQ, Python-side, backed by Redis) does anything that shouldn't block an HTTP request: OCR processing, weekly digest generation, outbound notifications. This is also the natural place where "scale" happens — a burst of document uploads adds jobs to a queue, and you add workers, not bigger web servers.

**Why this split matters for what you're trying to learn:** it forces a real reason for load balancing (two independently-scalable services, not one monolith), a real reason for caching (expensive dashboard aggregates and repeated LLM context), and a real reason for a queue (agent and OCR work that must never block a request). None of it is there to pad a resume — it's the minimum shape that makes the product actually work under real load.

---

## 7. Backend concepts to master

This is the core of the "advanced backend" part of your ask. Each subsection names the concept and where in CareCircle it applies — go research each one properly before implementing it.

### 7.1 API design
Model resources per-circle, so the tenant boundary is explicit in the URL shape itself — conceptually: `circles/{id}/members`, `circles/{id}/medications`, `circles/{id}/documents`, `circles/{id}/checkins`, `circles/{id}/tasks`. Version from day one (`/api/v1/...`). Use cursor-based pagination for feed-like endpoints (digest history, check-in history). Add idempotency keys to anything a flaky mobile connection might retry (logging a check-in, uploading a document). Any webhook receiver (inbound WhatsApp messages, pharmacy callbacks) needs signature verification and replay protection — research HMAC-based webhook verification.

### 7.2 AuthN/AuthZ & multi-tenant RBAC
Session or JWT-based auth with refresh-token rotation. The important part is that a user's role is a property of their *membership in a specific circle*, not a global attribute — classic multi-tenant permission modeling. For defense in depth, research **Postgres Row-Level Security (RLS)**: policies that make the database itself refuse to return rows for a circle the requesting connection isn't scoped to, so a bug in your application logic isn't the only thing standing between one family's data and another's.

### 7.3 Caching strategy — the flagship concept here, applied at multiple layers
- **Circle dashboard cache**: the dashboard (adherence %, upcoming items, last digest) is expensive to compute fresh on every request. Apply the **cache-aside pattern** — check Redis first, compute and populate on a miss with a sensible TTL, and (the part people skip) explicitly invalidate the specific affected keys on every write, rather than relying on a short TTL as a crutch.
- **Session & rate-limit state** in Redis.
- **LLM context caching**: most LLM providers support caching repeated prompt prefixes (e.g., a circle's static profile that doesn't change between agent calls) to cut cost and latency — research whichever provider's mechanism applies to the one you pick.
- **CDN/HTTP caching** for static content once the Phase 2 marketplace exists.
- Research further: cache stampede / thundering-herd prevention, TTL jitter, write-through vs. write-behind vs. cache-aside tradeoffs.

### 7.4 Async processing & queues
OCR and agent-heavy work must never block an HTTP request. Push it onto a Redis-backed queue (Celery or RQ) and let a separate worker pool process it, notifying the client via websocket/webhook/polling when done. This is also your actual scaling lever for bursty load — a spike in document uploads grows the queue, and you scale workers, not your API tier.

### 7.5 Load balancing & horizontal scaling
Once you run more than one instance of the API/agent service, put a reverse proxy or cloud load balancer in front (Nginx, or an AWS ALB since you already know AWS). Prefer **stateless JWT auth over sticky sessions** so any instance can serve any request — this is what makes scaling out trivial instead of painful. As read load on the dashboard grows, consider a **Postgres read replica** for those queries while writes stay on the primary. Apply per-circle/per-IP rate limiting at the edge so one noisy circle can't degrade service for everyone. Implement health-check endpoints so the load balancer can detect and drain an unhealthy instance during deploys.

### 7.6 Database design & indexing
Relational core in Postgres, with `circle_id` as a foreign key baked into nearly every table — the tenant boundary lives in the schema, not just in application code. Index the columns you'll actually filter/sort by in hot paths (upcoming reminders by due time, recent documents by upload time). Add soft-delete and audit columns (who changed what, when) to anything touching sensitive data — this is exactly the trail privacy regulation expects to see (more in §11). Keep the vector index in the same Postgres instance via `pgvector` rather than standing up a separate vector database until scale genuinely demands it.

### 7.7 Real-time updates
An emergency alert should reach every Circle member instantly, not on next page load. Research WebSockets or Server-Sent Events for this, with **Redis pub/sub** fanning a single event out to clients connected to different server instances — one more reason Redis shows up everywhere in this architecture.

### 7.8 Observability
Structured (JSON) logs carrying a request/trace ID that follows one request across the Next.js layer, the agent service, and any worker job it spawns. Track latency, error rate, and queue depth as metrics. This is what actually tells you whether your load balancing and caching are *working*, rather than just present.

### 7.9 Rate limiting & abuse protection
Protect the agent-calling endpoints especially — they're the most expensive per request. A token-bucket limiter scoped per circle is a reasonable default to research.

---

## 8. Agentic AI architecture

### 8.1 Agent roster
- **Document Intelligence Agent** — OCRs uploaded documents (prescriptions, lab reports, discharge summaries), extracts structured fields (medication, dosage, date, doctor, key values), writes them into the timeline and the vector index. It structures what a document *says*; it never interprets what it *means* clinically.
- **Adherence & Trend Agent** — runs on a schedule, reviews check-in and medication logs, computes adherence rate, and flags patterns (repeated missed evening doses, a lab value trending in one direction across visits) for the digest agent. Flags patterns; never diagnoses.
- **Digest & Communicator Agent** — weekly, synthesizes adherence trends, upcoming events, and flagged items into one calm, factual message for the whole Circle. Every flagged health item closes with "worth raising with Dr. X," never a recommendation.
- **Coordination Agent** — helps with the task/vendor board: drafts messages to vendors, checks caregiver availability, sequences tasks. Closest to the ERP/automation work you've already done.
- *Phase 2* — **Conversational Intake Agent**: lets a caregiver or recipient message naturally (WhatsApp-style) and extracts structured data behind the scenes. Directly reuses your existing WhatsApp/Groq bot experience.

### 8.2 Orchestration pattern
Use **LangGraph**, which you're already learning. Current practice strongly favors a **supervisor/router pattern** as the default — a supervisor node routes to the right specialist agent based on the task, rather than a peer-to-peer/swarm design where every agent can talk to every other. Router-style coordination handles the large majority of real use cases; reserve anything more exotic for once you understand this system's failure modes firsthand. LangGraph's **Command primitive** lets an agent hand off to another dynamically at runtime without pre-wiring every possible edge, and built-in **checkpointing** gives you state persistence and recovery if a multi-step agent run fails partway through — both worth using rather than reinventing.

### 8.3 Tool-calling & permissioning
Each agent gets its own scoped tool set — the Document Intelligence Agent can read the document store and write to the timeline, but has no reason to touch the task board; the Coordination Agent can draft vendor messages but shouldn't read medical documents it doesn't need. This **least-privilege scoping per agent** is current best practice for exactly the reason you'd guess: it limits the blast radius of a bad tool call or an injected instruction hidden inside an uploaded document.

### 8.4 RAG design & tenant isolation
The vector index (pgvector) lets a family ask "what did the cardiologist say last visit?" and get an answer grounded in their own documents. The one rule that cannot be relaxed: every retrieval query is scoped to `circle_id`, with no code path that can accidentally search across circles. Treat this the same way you'd treat the RLS policy in §7.2 — a hard boundary, tested explicitly.

### 8.5 Guardrails & evals
Build a small adversarial eval set before you trust any agent in front of a real family: prompts like "should I increase the dose?" or "is this cancer?" should reliably get redirected to a real professional, every time, not just usually. Log every agent decision for audit. Add a **human-in-the-loop interrupt** (a LangGraph primitive) for any action that would modify a medication schedule or contact emergency services — agents should never auto-execute those without a human confirming.

### 8.6 Cost & latency optimization
Beyond LLM context caching (§7.3), design a thin **provider-abstraction layer** so Claude, Groq, and Gemini are all swappable behind one interface — you've already used all three, and this is a genuinely good adapter-pattern exercise on top of being practical for cost and rate-limit management.

---

## 9. DevOps roadmap

### 9.1 Local development
`docker-compose` bringing up Next.js, the Python agent service, Postgres, Redis, and a local S3-compatible store (MinIO), so the whole stack runs identically on your laptop as it eventually will in the cloud.

### 9.2 CI/CD
GitHub Actions (you already know this): lint → test → build container images → push to a registry → deploy. Treat the pipeline as a first-class part of the project, not an afterthought bolted on before launch.

### 9.3 Environments
Separate dev, staging, and prod, each with its own database and secrets, so a schema migration or a new agent prompt gets tested against staging before it ever touches a real family's data.

### 9.4 Secrets management
Never commit secrets. Use the platform's secret store (GitHub Actions secrets for CI, AWS Secrets Manager or SSM Parameter Store for runtime, since you already know AWS). Rotate LLM provider keys periodically.

### 9.5 Deployment & scaling story
Be honest with yourself about sequencing: a single docker-compose host is a completely legitimate v1 deployment. The point of designing for load balancing and horizontal scaling isn't that you need it on day one — it's that the architecture (stateless services, externalized session/cache state, queue-based workers) doesn't have to be rebuilt when you do. When you're ready: API/agent services behind an AWS ALB across 2+ instances, managed Postgres (RDS), managed Redis (ElastiCache), S3 for storage — all things you already have hands-on AWS experience with.

### 9.6 Monitoring, logging, and backups
Uptime and error-rate alerting from day one of having any real user. Automated Postgres backups *with a tested restore process* — a backup you've never restored isn't a backup. A defined log retention policy.

---

## 10. Data model sketch (conceptual — no schema syntax)

- **User** — auth identity
- **Circle** — the tenant
- **Membership** — User × Circle × Role (Coordinator / Recipient / Caregiver / ProfessionalViewer)
- **RecipientProfile** — belongs to a Circle
- **Medication** — belongs to a RecipientProfile, has a schedule
- **MedicationLog** — each dose taken/missed, belongs to a Medication
- **Appointment** — belongs to a RecipientProfile
- **Document** — belongs to a Circle; file reference in object storage + extracted text/fields + a vector embedding reference
- **CheckIn** — daily log entry, belongs to a RecipientProfile
- **Task** — vendor/coordination board item, belongs to a Circle
- **DigestEntry** — a generated weekly digest, belongs to a Circle, references exactly which data it summarized (for auditability)
- **AuditLog** — who did what, when, across all of the above

---

## 11. Privacy, security & compliance

You're handling family health-adjacent data, which means privacy-by-design isn't optional polish — bake in encryption at rest and in transit, consent capture when a Circle is created and members/documents are added, and a real data export-and-deletion flow (an actual control, not a support email).

If you build this from India and any real user is in India: the DPDP Act's rules were notified in November 2025, with phased implementation — a Consent Manager framework due around November 2026, and full substantive obligations (breach notification, security safeguards, data-principal rights) coming into force in May 2027. That timeline means "privacy by design" will be a genuinely live requirement, not a hypothetical, by the time this project is mature enough for real users. I'm not a lawyer and this isn't compliance sign-off — treat it as a pointer to research properly, and if you ever onboard real families' data, get an actual legal read rather than treating this section as complete.

---

## 12. Suggested tech stack (mapped to what you said you want to learn)

- **Frontend + BFF**: Next.js (App Router) — dashboard, check-in UI, task board, and eventually the marketplace
- **Agent service**: Python + FastAPI + LangGraph — the "Python (agentic AI)" half of your goal
- **LLM providers**: Claude, Groq, Gemini behind a thin provider-abstraction interface (§8.6)
- **Datastores**: PostgreSQL + `pgvector`, Redis, S3-compatible object storage
- **Queue/workers**: Celery or RQ
- **Containerization**: Docker + docker-compose
- **Cloud**: AWS (EC2/ECS, RDS, ElastiCache, S3) — building on what you already know
- **CI/CD**: GitHub Actions
- **Reverse proxy / LB**: Nginx or AWS ALB

---

## 13. Build phases (rough — adjust freely)

| Phase | Focus | Rough duration |
|---|---|---|
| 0 | Design: data model, API contracts, non-negotiable boundaries, repo + CI skeleton, local docker-compose | 2–3 weeks |
| 1 | Core backend: multi-tenant model, auth/RBAC, CRUD APIs, a plain dashboard consuming them | 3–4 weeks |
| 2 | Documents + caching: object storage, OCR ingestion worker, Redis caching layer, rate limiting | 2–3 weeks |
| 3 | Agentic layer v1: Python agent service, LangGraph orchestration, Document Intelligence + Adherence agents, tool permissioning, first eval set | 3–4 weeks |
| 4 | Real-time + digest: websockets/notifications, Digest & Communicator agent, scheduled orchestration | 2 weeks |
| 5 | Scale-readiness: containerize everything, load balancer in front, horizontal scale test, observability | 2 weeks |
| 6 | DevOps hardening: full CI/CD, staging/prod split, secrets management, backups + restore drill, cloud deploy | 2–3 weeks |
| 7 | Open-source launch: docs, demo instance, first outside users/contributors | ongoing |

That's roughly 18–20 weeks of focused work for a solid v1 — a compass, not a deadline, given you're doing this alongside Nxtvision and EduLynx.

---

## 14. Open-source practices

- README that leads with the problem (§1) and the architecture diagram, followed by a docker-compose quick-start
- CONTRIBUTING.md and a CODE_OF_CONDUCT — this touches families and elder care, so a respectful contributor culture matters more than usual
- License: MIT for maximum adoption, or AGPL if you specifically want to prevent someone from taking the code and running a closed commercial hosted version without contributing back — your call, worth researching the tradeoff rather than defaulting
- A public roadmap (GitHub Projects) so contributors know where help is actually wanted

---

## 15. Success criteria

You'll know v1 is real when: there's a working hosted demo instance; at least one real family (yours counts) has used it for a full month; the docs are clean enough that a stranger could self-host it from the README alone; and — the personal test that matters most given why you're building this — you can explain and defend every architectural decision in this document out loud, without an AI assistant explaining your own system back to you.

---

## 16. Per-phase research checklist

Pointers, not explanations — look each of these up properly when you reach that phase:

- **Phase 0–1**: multi-tenant data modeling, JWT vs. session auth, Postgres Row-Level Security, REST resource versioning
- **Phase 2**: cache-aside pattern, cache invalidation strategies, TTL jitter, thundering herd, presigned URLs for object storage uploads
- **Phase 3**: LangGraph supervisor pattern, the Command primitive, checkpointing/state persistence, least-privilege tool scoping, prompt-injection risk from user-uploaded documents
- **Phase 4**: WebSockets vs. SSE, Redis pub/sub, idempotent notification delivery
- **Phase 5**: stateless auth for horizontal scaling, health-check/graceful-drain patterns, Postgres read replicas
- **Phase 6**: infrastructure-as-code (even a light Terraform setup), blue-green vs. rolling deploys, backup/restore drills, secret rotation

---

## 17. Rebuilding your engineering judgment while you build this

The real reason for this project is that agentic coding tools have quietly eaten some of your own ability to think through a system end to end. Use this project deliberately against that:

- For every hard piece — the schema, the cache-invalidation logic, the agent graph, the RLS policy — write your own design in prose before any generated code exists.
- Use AI assistants for scaffolding and boilerplate *after* the design is yours, not instead of it.
- Periodically, pick one piece of your own system and explain it out loud with no code open. If you can't, that part isn't actually yours yet — go back and rebuild your own understanding of it before moving on.

That habit is worth more than any individual feature in this document.