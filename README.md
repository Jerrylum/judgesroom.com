# judgesroom.com — A Digital Judging Room for VEX Robotics Competitions

Before judgesroom.com, judging meant paper rubrics, sticky notes, and hours of sorting through documents. Paper workflows are time‑consuming and hard to organize; determining award winners is tedious and error‑prone. After the event, piles of confidential judging materials must be destroyed securely.

By digitizing the judging steps (interviews, rubrics, nominations, rankings), judgesroom.com streamlines the process, reduces errors, and keeps materials confidential. Judges can share the same Judges' Room across multiple devices, making collaboration faster and easier.

judgesroom.com is an open source project aligned with the GRSF VEX Competition judging guidelines. The system is designed to support Judge Advisors and Judges through the process while preserving confidentiality and helping prevent errors. Event Partners may self‑host the application to have full control over the system. A local self‑hosting guide (Bun + Wrangler) is provided below.

## What judgesroom.com does for you

This system is aligned with the GRSF VEX Competition judging guidelines, mapping app features directly to each judging activity in a typical event.

### Import teams and event info from VEX Events, set up awards and divisions

<!-- [placeholder: screenshot-import-and-setup.png] -->
![Import and setup](/docs/assets/screenshot-import-and-setup.png)

### Invite Judges to a shared Judges' Room via link

![Join judges room](/docs/assets/screenshot-join-judges-room.png)

### Submit Interview and Engineering Notebook rubrics digitally

![Rubrics](/docs/assets/screenshot-rubrics.png)

### Shortlist nominees per award and track follow‑ups

![Nominations and followups](/docs/assets/screenshot-nominations-followups.png)

### View performance data and Excellence eligibility in real time

![Performance eligibility](/docs/assets/screenshot-performance-eligibility.png)

### Rank winners and re-order teams without worrying about duplicate judged awards

![Award ranking](/docs/assets/screenshot-award-ranking.gif)

### Keep confidential materials in one secure place and delete them afterward

![Destroy room](/docs/assets/screenshot-destroy-room.png)

## Quick Start (Hosted)

1. Go to `https://judgesroom.com/app`
2. Paste the Judges' Room invite link to join, or start a new event
3. Follow the on‑screen steps: Event Setup → Role Selection → Workspace

You can always return to the same room later even after closing the browser tab.

Operational limits (photos per team, connections per judge link, room lifetime, and more) are listed in [docs/limits.md](docs/limits.md).

## Self‑Hosting

Prerequisites:

- Bun
- Node.js (required by Wrangler)

Steps:

1. Install workspaces

```bash
# From repo root
bun install
```

2. Build the web app for production

```bash
cd web && bun run build
```

This produces static assets in `web/build` (SvelteKit adapter-static).

3. Run the Worker locally in production mode (serves `web/build`)

```bash
cd ../worker && bunx wrangler dev --env production
```

Notes:

- The Worker will serve static assets from `../web/build` per `wrangler.jsonc` when using `--env production` (or `--env beta`).
- Default local port is http://localhost:8787
- Keep the terminal open while running. Press Ctrl+C to stop.
- Interview photos require a Cloudflare R2 bucket bound as `TEAM_PHOTOS` (see below).

### R2 bucket for interview photos

Team interview photos are stored in a private R2 bucket (not public). Configure the bucket before deploying:

```bash
cd worker

# Create the production bucket (once)
bunx wrangler r2 bucket create judgesroom-team-photos

# Optional local/preview bucket
bunx wrangler r2 bucket create judgesroom-team-photos-preview

# Expire all objects after 7 days (hosted confidentiality safety net)
bunx wrangler r2 bucket lifecycle add judgesroom-team-photos \
  --name expire-after-7-days \
  --expire-days 7
```

When a Judges' Room is destroyed, the Worker deletes that room's photo objects (keyed by photo id) and purges their cache tags. Photos are compressed in the browser (max long edge 1600px) and rejected above 3 MB; each team is limited to 10 photos. See [docs/limits.md](docs/limits.md) for the full list.

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
- The hosted privacy policy applies only to `judgesroom.com`. Follow the confidentiality practices in the GRSF judging guidelines (e.g., secure access, destroy materials post‑event).
- If you enable interview photos, provision the R2 bucket, keep it private, set a short lifecycle (e.g. 7 days), and ensure destroy-room deletes room prefixes.

## How judgesroom.com aligns with GRSF judging guidelines

- Confidentiality: Deliberation notes, rankings, and materials stay inside the Judges' Room; easy to delete at event end.
- Award types: Supports Performance, Judged (Excellence, Design, Innovate, Judges Award, etc.), and Volunteer Nominated (Sportsmanship, Energy) workflows. Event Partners can add custom awards to the system if needed.
- Deliberations: Supports the GRSF deliberation workflow — nominate candidates, gather additional information, review event data, select winners, enter winners, and secure materials. See the Judging Deliberations and Preparing For and Judging at an Event articles in the GRSF judging guidelines.
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

- `@jerrylum/wrpc`: Bidirectional, type‑safe WebSocket RPC (npm)
- `worker`: Cloudflare Worker with Durable Object for connection/state; serves static assets in production
- `web`: SvelteKit UI built to static site; connects to Worker via HTTP/WebSocket
- `protocol`: Zod schemas and shared types

Key configs: `worker/wrangler.jsonc`, `worker/drizzle.config.ts`

## Data Privacy

See https://judgesroom.com/privacy for more details.
