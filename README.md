# judgesroom.com — A Digital Judging Room for VEX Robotics Competitions

Before judgesroom.com, judging meant paper rubrics, sticky notes, and hours of sorting through documents. Paper workflows are time‑consuming and hard to organize; determining award winners is tedious and error‑prone. After the event, piles of confidential judging materials must be destroyed securely.

By digitizing the judging steps (interviews, rubrics, nominations, rankings), judgesroom.com streamlines the process, reduces errors, and keeps materials confidential. Judges can share the same Judges' Room across multiple devices, making collaboration faster and easier.

judgesroom.com is an open source project aligned with the GRSF VEX Competition judging guidelines. The system is designed to support Judge Advisors and Judges through the process while preserving confidentiality and helping prevent errors. Event Partners may self‑host the application to have full control over the system. Self‑hosting options are described below.

## What judgesroom.com does for you

This system is aligned with the GRSF VEX Competition judging guidelines, mapping app features directly to each judging activity in a typical event.

### Import teams and event info from VEX Events, set up awards and divisions

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

## Quick Start

These steps use the hosted site at judgesroom.com. The Judges' Room runs on our servers, so any judge with the invite link can join from the internet. That is a good fit when the venue has a stable internet connection. How we handle judging materials is described in the [Data Protection and Privacy](https://judgesroom.com/privacy) policy.

If you would rather keep the room on your own computer or Cloudflare account, so judging does not depend on the public internet, see [Self‑Hosting](#self-hosting).

1. Go to `https://judgesroom.com/app`
2. Click **Or start a new one**
3. Enter information and set up the room
4. Share the room with other judges and start the judging sessions

You can return to the same room later even after closing the browser tab.

Operational limits (photos per team, connections per judge link, room lifetime, and more) are listed in [docs/limits.md](docs/limits.md).

## Self‑Hosting

There are multiple ways to self‑host judgesroom.com. Note that the privacy policy applies only to the official hosted site at `https://judgesroom.com`. You are responsible for privacy, security, and compliance when self‑hosting. Follow the confidentiality practices in the GRSF judging guidelines (e.g., secure access, destroy materials post‑event).

### Standalone server (recommended for events)

It is a local copy of the app that you run on a laptop or personal computer at the event. This is similar to running VEX Tournament Manager: one computer acts as the server and stays on a stable local competition network. Judges connect to that network, usually over Wi‑Fi, and join from their own devices by entering the server IP address. You do not depend on judgesroom.com or a working internet uplink once the app is running, which keeps the room available if venue cannot reach the public internet.

It is a standalone app. You do not need to install anything to use it. Unzip the folder and double‑click the start script.

Download a zip from [GitHub Releases](https://github.com/Jerrylum/judgesroom.com/releases/latest):

- `judgesroom-standalone-windows-x64.zip` — Windows 10/11
- `judgesroom-standalone-macos-arm64.zip` — Apple Silicon Macs (M1 and later)

Unzip it somewhere writable, then double‑click **Start**. Allow the firewall on Private networks if asked. On macOS, the first open from Downloads may need Right‑click → Open.

On the host computer, open the printed LAN URL (`http://<lan-ip>:8787`) before you create the room. Never start on localhost. Create the room only after that URL works, then share the invite link. The invite link should also start with your LAN IP, not `localhost` or `127.0.0.1`. Keep the window open while judges are connected. Press `x` or close the window to stop.

Room data is stored in `data/` next to the start script. After the event, destroy the room in the app, or delete the `data/` folder. You can keep the app for the next event.

### Run from source-code (advanced)

Use this if you are developing judgesroom.com or you want to run the Worker yourself instead of the standalone zip.

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
cd ../worker && bunx wrangler dev --env production --ip 0.0.0.0
```

Notes:

- The Worker will serve static assets from `../web/build` per `wrangler.jsonc` when using `--env production` (or `--env beta`).
- Default local port is 8787. This machine can open [http://localhost:8787](http://localhost:8787). `--ip 0.0.0.0` also listens on the LAN so other devices can open `http://<lan-ip>:8787`. Allow the firewall on Private networks if asked.
- Keep the terminal open while running. Press Ctrl+C to stop.
- Local Wrangler can simulate R2 for interview photos. A real Cloudflare R2 bucket is required when you deploy (see below).

Optional: Update database schema (Drizzle ORM)

```bash
# Generate migrations from schema changes
cd worker && bun run db:generate
```

### Self deploy

Deploy judgesroom.com on your own Cloudflare account if you want a hosted instance that judges can open from anywhere, not only on the event LAN. You keep the same Worker / Durable Object / R2 architecture as the public site, and you control the account, data, and (optionally) the domain.

This is useful when an organization wants its own URL, its own data residency, or a room that stays reachable after people leave the venue network.

1. Create a Cloudflare account and log in with Wrangler (`bunx wrangler login` from `worker/`).
2. Provision a private R2 bucket for interview photos and bind it as `TEAM_PHOTOS`.
3. Build the web app, then deploy the Worker.

```bash
# From repo root
bun run deploy
```

Or, after `web` is already built:

```bash
cd worker && bun run deploy
```

R2 bucket for interview photos:

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

When a Judges' Room is destroyed, the Worker deletes that room's photo objects (keyed by photo id) and purges their cache tags.

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

### Pack Standalone

```bash
bun run pack:standalone -- --target windows-x64
bun run pack:standalone -- --target macos-arm64
```

## Architecture

- `@jerrylum/wrpc`: Bidirectional, type‑safe WebSocket RPC (npm)
- `worker`: Cloudflare Worker with Durable Object for connection/state; serves static assets in production
- `web`: SvelteKit UI built to static site; connects to Worker via HTTP/WebSocket
- `protocol`: Zod schemas and shared types

Key configs: `worker/wrangler.jsonc`, `worker/drizzle.config.ts`

## Data Privacy

See [https://judgesroom.com/privacy](https://judgesroom.com/privacy) for more details.
