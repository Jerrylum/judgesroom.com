# judgesroom.com — A Digital Judging Room for VEX Robotics Competitions

Before judgesroom.com, judging meant paper rubrics, sticky notes, and hours of sorting through documents. Paper workflows are time‑consuming and hard to organize; determining award winners is tedious and error‑prone. After the event, piles of confidential judging materials must be destroyed securely.

By digitizing the judging steps (interviews, rubrics, nominations, rankings), judgesroom.com streamlines the process, reduces errors, and keeps materials confidential. Judges can share the same Judges' Room across multiple devices, making collaboration faster and easier.

judgesroom.com is an open source project and fully compliant with the RECF/VEX "Guide To Judging." The system is designed to support Judge Advisors and Judges through the process while preserving confidentiality and helping prevent errors. Event Partners may self‑host the application to have full control over the system. A ready‑to‑use Docker Compose is provided below.
judgesroom.com is an open source project and fully compliant with the RECF/VEX "Guide To Judging." The system is designed to support Judge Advisors and Judges through the process while preserving confidentiality and helping prevent errors. Event Partners may self‑host the application to have full control over the system. A local self‑hosting guide (Bun + Wrangler) is provided below.

## What judgesroom.com does for you

This system is aligned with the RECF/VEX “Guide To Judging,” mapping app features directly to each judging activity in a typical event.

### Import teams and event info from RobotEvents, set up awards and divisions

[placeholder: screenshot-import-and-setup.png]

### Invite Judges to a shared Judges' Room via link

[placeholder: screenshot-join-judges-room.png]

### Submit Interview and Engineering Notebook rubrics digitally

[placeholder: screenshot-rubrics.png]

### Shortlist nominees per award and track follow‑ups

[placeholder: screenshot-nominations-followups.png]

### View performance data and Excellence eligibility in real time

[placeholder: screenshot-performance-eligibility.png]

### Rank winners and re-order teams without worrying about duplicate judged awards

[placeholder: screenshot-award-ranking-guardrails.png]

### Keep confidential materials in one secure place and delete them afterward

[placeholder: screenshot-destroy-room.png]


## Quick Start (Hosted)

1. Go to `https://judgesroom.com/app`
2. Paste the Judges' Room invite link to join, or start a new event
3. Follow the on‑screen steps: Event Setup → Role Selection → Workspace

You can always return to the same room from the saved permit on your device.

## Self‑Hosting

Prerequisites:

- Bun
- Node.js (required by Wrangler)

Steps:

1) Install workspaces

```bash
# From repo root
bun install
```

2) Build the web app for production

```bash
cd web && bun run build
```

This produces static assets in `web/build` (SvelteKit adapter-static).

3) Run the Worker locally in production mode (serves `web/build`)

```bash
cd ../worker && bunx wrangler dev --env production
```

Notes:

- The Worker will serve static assets from `../web/build` per `wrangler.jsonc` when using `--env production` (or `--env beta`).
- Default local port is http://localhost:8787
- Keep the terminal open while running. Press Ctrl+C to stop.

Optional: Deploy to Cloudflare (production)

```bash
cd worker && bun run deploy
```

Optional: Update database schema (Drizzle ORM)

```bash
# Generate migrations from schema changes
cd worker && bun run db:generate
```

Self‑hosting responsibilities:

- You are responsible for privacy, security, and compliance when self‑hosting.
- The hosted privacy policy applies only to `judgesroom.com`. Follow the confidentiality practices in the Guide To Judging (e.g., secure access, destroy materials post‑event).

## How judgesroom.com aligns with the Guide To Judging

- Confidentiality: Deliberation notes, rankings, and materials stay inside the Judges' Room; easy to delete at event end.
- Award types: Supports Performance, Judged (Excellence, Design, Innovate, Judges Award, etc.), and Volunteer Nominated (Sportsmanship, Energy) workflows. Event Partners can add custom awards to the system if needed.
- Deliberations: Nominate (AD2), follow‑up (AD3), review reports (AD4), finalize rankings with alternates (AD5), enter winners in TM (AD6), collect and destroy materials (AD7).
- Excellence award guardrails: Helps avoid duplicate judged awards and cascades rankings when winners change.

## Development

### Install

```bash
bun install
```

### Run

```bash
cd web && bun run dev
cd worker && bun run dev
```

## Architecture

- `wrpc`: Bidirectional, type‑safe WebSocket RPC
- `worker`: Cloudflare Worker with Durable Object for connection/state; serves static assets in production
- `web`: SvelteKit UI built to static site; connects to Worker via HTTP/WebSocket
- `protocol`: Zod schemas and shared types

Key configs: `worker/wrangler.jsonc`, `worker/drizzle.config.ts`

## Data Privacy

See https://judgesroom.com/privacy for more details.
