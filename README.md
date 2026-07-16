# Nexus Assets - Smart Asset Management System

Nexus Assets is a hackathon-ready asset intelligence platform for universities and other organizations managing laptops, projectors, lab equipment, cameras, network devices, printers, and furniture. It goes beyond CRUD with QR custody workflows, lifecycle audit logs, maintenance automation, risk signals, PDF exports, and AI-backed operational recommendations.

## What it includes

- JWT authentication and role-based access: Admin, Asset Manager, Technician, and Viewer.
- Asset registry with search, filters, lifecycle status, condition, warranty, location, QR identity, and risk score.
- QR camera scanner and manual lookup for fast asset checkout and return.
- Custody controls that prevent invalid assignments and preserve a full audit trail.
- Maintenance desk with priorities, work status, costs, service history, and automatic availability updates.
- Chart.js dashboard with inventory, condition, assignment, overdue, maintenance, warranty, and risk signals.
- OpenAI-backed recommendations when configured; deterministic local recommendations when no API key is present.
- Professional PDF exports for inventory, maintenance, and audit records; individual printable QR labels.

## Quick start

Prerequisites: Node.js 20+ and MongoDB (local or Atlas).

1. Copy `.env.example` to `.env` in the project root and set `MONGODB_URI` and a strong `JWT_SECRET`.
2. Install packages:

   ```bash
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

3. Seed demo users and university inventory:

   ```bash
   npm run seed
   ```

4. Start the full application:

   ```bash
   npm run dev
   ```

Open `http://localhost:5173`.

Demo login: `admin@nexus.edu` / `NexusDemo!2026`

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Express API port (default `5000`) |
| `CLIENT_URL` | Allowed frontend origin |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long secret for signed user sessions |
| `OPENAI_API_KEY` | Optional; enables OpenAI operational analysis |
| `OPENAI_MODEL` | Optional OpenAI model override (default `gpt-4.1-mini`) |

Without `OPENAI_API_KEY`, the dashboard transparently shows rule-based recommendations built from real aggregated data. No personal borrower data is sent to the AI service.

## API groups

- `/api/auth` — sign-in, current user, user directory
- `/api/assets` — registry, QR lookup, detail, create, update
- `/api/assignments` — checkout, active loans, returns
- `/api/maintenance` — tickets and technician updates
- `/api/dashboard` — aggregated KPIs, charts, alerts, activity
- `/api/insights` — AI or fallback operational recommendations
- `/api/reports` — inventory, maintenance, and audit export data
- `/api/audit` — immutable lifecycle events

## Validation

```bash
npm run build
npm test
```

The backend test suite covers risk escalation/capping and the no-key AI fallback. The frontend production build is compiled with Vite.

## Hackathon demo path

1. Sign in with the seeded admin account.
2. Review the dashboard's overdue laptop loan and lab-equipment maintenance risk.
3. Open **Scan & Move**, enter `AST-IT-001`, and return the overdue laptop.
4. Open the maintenance desk and resolve a service ticket.
5. Download an audit or inventory PDF from **Reports**.

## Deploy to Render

The included `render.yaml` deploys the React client and Express API together as one Render web service. It builds the client, serves the compiled application from Express, seeds the demo data after the first deployment, and exposes `/api/health` for health checks.

1. Create a free MongoDB Atlas cluster and allow Render's outbound access in its network settings.
2. In Render, select **New -> Blueprint**, connect `Khanhiba/Smart-Asset-Management-system`, and select the `main` branch.
3. Render discovers `render.yaml`. Enter the Atlas URI when prompted for `MONGODB_URI`; Render generates `JWT_SECRET` automatically.
4. Create the Blueprint and wait for the build and one-time seed to finish. The assigned `onrender.com` URL serves both the website and API.

Set `OPENAI_API_KEY` manually in the Render service environment only if live OpenAI insights are desired. Without it, Nexus uses its built-in deterministic insight fallback.

If you create a Render **Web Service** instead of a Blueprint, use these exact settings:

| Setting | Value |
| --- | --- |
| Root Directory | Leave blank (repository root) |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

The root build script installs the client and server workspaces with development build tools, then compiles the Vite client. This avoids the `vite: not found` / exit status `127` error that occurs when Render installs only the root package.
