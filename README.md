# Nexus Assets

Nexus Assets is a production-oriented asset lifecycle system for universities and organizations managing equipment, inventory, maintenance, QR custody, and audit records.

The application consists of two deployable services:

- `client/` — React + Vite application deployed to Netlify.
- `server/` — Express API deployed to Render, backed by MongoDB Atlas.

The deployed frontend only calls `VITE_API_URL`. There is no local-storage, mock-data, or automatic demo-login fallback in production.

## Production capabilities

- JWT sessions with expiry, bcrypt password hashing, protected API routes, and Admin / Asset Manager / Technician / Viewer permissions.
- MongoDB-backed asset, assignment, maintenance, and immutable audit-log records.
- QR labels, camera and manual lookup, lifecycle check-out / return controls, maintenance workflows, reports, and dashboard analytics.
- Input validation, NoSQL-injection sanitisation, rate limits, CORS allow-listing, Helmet headers, CSP, compression, request IDs, and centralized API errors.
- `/api/health` reports API and MongoDB connection status for the deployment health check.

## Local setup

Use Node.js 20 or 22 and a MongoDB Atlas connection string. MongoDB must be running and reachable before starting the API.

1. Copy the environment templates:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item client/.env.example client/.env
   ```

2. In `.env`, set a real Atlas `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and `CLIENT_URL=http://localhost:5173`.

3. In `client/.env`, set:

   ```dotenv
   VITE_API_URL=http://localhost:5000
   ```

4. Install packages and start both services:

   ```powershell
   npm install
   npm install --prefix server
   npm install --prefix client
   npm run dev
   ```

5. Create the first administrator (this uses the Atlas database configured in `.env`):

   ```powershell
   $env:BOOTSTRAP_ADMIN_NAME="Your Name"
   $env:BOOTSTRAP_ADMIN_EMAIL="admin@your-organization.edu"
   $env:BOOTSTRAP_ADMIN_PASSWORD="Use-a-unique-password-with-12-or-more-characters"
   npm run bootstrap:admin
   ```

Open `http://localhost:5173` and sign in with that administrator account.

`npm run seed` is only available for non-production development data. It is deliberately blocked when `NODE_ENV=production` and is never run when the API starts.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port. Render supplies this automatically. |
| `NODE_ENV` | Yes in production | Set to `production` on Render. |
| `MONGODB_URI` | Yes | MongoDB Atlas URI for the real application data. |
| `JWT_SECRET` | Yes | Unique random secret, at least 32 characters. |
| `JWT_EXPIRES_IN` | No | Session duration; defaults to `8h`. |
| `JWT_ISSUER` / `JWT_AUDIENCE` | No | Token validation identifiers. |
| `CLIENT_URL` | Yes | Comma-separated allowed browser origins, with no path or trailing slash. |
| `OPENAI_API_KEY` | No | Enables OpenAI-powered aggregate operational insights. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4.1-mini`. |
| `VITE_API_URL` | Yes for Netlify | Public URL of the Render API, with no trailing slash. |

The API fails fast with a clear startup error if `MONGODB_URI`, `JWT_SECRET`, or `CLIENT_URL` is absent or invalid.

## Deploy the API to Render

1. In MongoDB Atlas, create a database user and allow network access for the Render service. Copy its `mongodb+srv://...` URI.
2. In Render, choose **New → Blueprint**, select `Khanhiba/Smart-Asset-Management-system`, and deploy the `main` branch. Render reads `render.yaml`.
3. Set the required variables in the Render service:

   ```dotenv
   MONGODB_URI=mongodb+srv://...
   CLIENT_URL=https://smart-asset-management-system.netlify.app
   ```

   Render generates `JWT_SECRET`. Do not use a sample value, and do not configure automatic seed data in production.
4. Render uses these settings from the Blueprint:

   | Setting | Value |
   | --- | --- |
   | Root directory | `server` |
   | Build command | `npm ci --omit=dev` |
   | Start command | `npm start` |
   | Health check | `/api/health` |
5. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/health`. It must return HTTP `200` and `"database":"connected"` before connecting Netlify.

To create the first production administrator, run `npm run bootstrap:admin` locally with the production Atlas URI and `NODE_ENV=production`, or run the same command from a Render shell after providing the three `BOOTSTRAP_ADMIN_*` environment variables. Remove the bootstrap password environment variable immediately afterwards.

## Deploy the frontend to Netlify

1. Import the GitHub repository in Netlify. `netlify.toml` supplies the build configuration:

   | Setting | Value |
   | --- | --- |
   | Base directory | `client` |
   | Build command | `npm ci --include=dev && npm run build` |
   | Publish directory | `client/dist` |
   | Node version | `20` |
2. Add a Netlify environment variable:

   ```dotenv
   VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
   ```

3. Trigger a fresh deploy. Vite bakes this variable into the browser bundle, so changing it always requires a redeploy.
4. Update Render `CLIENT_URL` with the exact Netlify production domain. If you also use a Netlify preview URL, add it as a comma-separated second origin.

Netlify serves the SPA fallback and the headers in `client/public/_headers`. The API sets its own equivalent server security headers.

## Verification

Run these before release:

```powershell
npm run build
npm test
```

After deployment, verify the following against the live URLs:

1. `GET /api/health` returns `200` and MongoDB is `connected`.
2. Invalid sign-in shows `Invalid email or password.` without leaking account details.
3. A real admin can create an asset, scan or manually look it up, check it out, return it, open and resolve maintenance, and download each report.
4. Viewer accounts cannot create or change records; technicians can manage maintenance but not create assets.
5. Test camera scanning and PDF downloads on a real HTTPS desktop and mobile browser, including a denied-camera-permission path.

## API groups

- `/api/auth` — sign-in, current session, and user management.
- `/api/assets` — asset registry, detail, QR lookup, create, and update.
- `/api/assignments` — check-out, active / overdue loans, and return.
- `/api/maintenance` — work tickets and technician updates.
- `/api/dashboard`, `/api/insights`, `/api/reports`, and `/api/audit` — aggregated operations, recommendations, export data, and audit trail.
