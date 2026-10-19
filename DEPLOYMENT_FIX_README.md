# NORTHLINE V5 — Vercel backend/database deployment fix

This patch is based on the NORTHLINE V5 source code. It **does not** contain your real .env files or Firebase Admin JSON credentials. The frontend API rewrite already in your GitHub `client/vercel.json` is included in this update.

## What changed

- `server/src/index.js`: Express app exported by default for Vercel; local listener only outside Vercel; shared MongoDB connection per serverless instance; reconnect attempt on each API invocation after disconnected state.
- Health endpoint actively tests MongoDB and shows a **non-sensitive** `issue` code; returns HTTP 503 if database/secret isn't ready instead of misleading HTTP 200 with `database:disconnected`.
- No `process.exit` during Vercel startup, and no 30-second polling worker in Vercel; local worker remains intact.
- Gmail transactional jobs (order, cart, forgot-password OTP, test, retries) attempt to flush in the active Vercel request, rather than relying entirely on background timers (delivery still depends on correct SMTP settings and networking).
- `server/vercel.json`: explicit Express framework selection.
- `.gitignore`: additional Firebase Admin credential file patterns.

## Deploy to existing GitHub repo

1. Back up your current project folder.
2. Apply the modified source files to **your existing repo**, keeping your working `client/.env` and `server/.env` LOCALLY. Do not commit these files. Alternatively, replace the existing project files with this archive after backing up your configuration.
3. Commit and push from your existing repository root (`git status`, `git add .`, `git commit -m "Fix NORTHLINE Vercel backend database connection"`, `git push origin main`). Always review `git status` before commit to ensure no credential JSON or `.env` is staged.
4. Vercel server project settings: **Root Directory `server`**, Framework Preset **Express**, Production Environment Variables (values only on Vercel, not GitHub):
   - `MONGO_URI` (correct Atlas URI; path `/codealpha_northline`, not `/studentManagement`)
   - `JWT_SECRET` (32+ characters; **use the same secret from local if preserving sessions**)
   - `CLIENT_URL=https://northline-store-five.vercel.app`
   - `STORE_PUBLIC_URL=https://northline-store-five.vercel.app`
   - `STORE_OWNER_EMAIL`, `SMTP_USER`, `SMTP_APP_PASSWORD`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (entire escaped private key in env value)
   - optional `AUTO_SEED=true` to create any missing catalog entries.
   - `NODE_ENV=production`
5. Frontend Vercel project: Root Directory **`client`**, framework **Vite**; ensure `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` all have correct underscores and production values. **Redeploy both projects** after environment changes.
6. Firebase Authentication > Settings > Authorized domains: add the actual frontend domain `northline-store-five.vercel.app`.
7. MongoDB Atlas > Network Access: ensure **the backend's outbound IP is permitted**; Atlas IP allowlist is not the same as Firebase authorized domains. Dynamic Vercel function egress IP can change. Consider a static-egress setup, or for a temporary development-only test allow access from anywhere (0.0.0.0/0) **only with strong unique database credentials, least-privilege database role, and safeguards**. Restrict once a secure connection route is available.
8. First verify `https://northline-store-cw9p.vercel.app/api/health`. Expect `ok:true` and `database:connected` plus `jwtConfigured:true`. Then check `https://northline-store-five.vercel.app/api/health` via the frontend rewrite. Only afterward test register/login, orders and Gmail notification delivery.

## How to interpret new health `issue`

- `DATABASE_URI_MISSING`: MONGO_URI missing, placeholder, incorrect project or environment scope.
- `DATABASE_DNS_ERROR`: Atlas hostname typo or DNS SRV lookup failed.
- `DATABASE_AUTH_ERROR`: Atlas database user credentials wrong or user lacks access.
- `DATABASE_NETWORK_ERROR`: Atlas IP allowlist/firewall/connection timeout.
- `DATABASE_CONNECTION_FAILED`: other MongoDB error; examine **backend Vercel Runtime Logs** (not Build Logs).
- `JWT_SECRET_MISSING`: JWT_SECRET not configured or shorter than 32 chars.

## Security

If any Atlas password, Firebase Admin private key, or Gmail App Password was ever pasted into chat, screenshots or committed to GitHub, **rotate it immediately**. Public Firebase web API configuration is not a substitute for the private Admin SDK credentials. Check repository history if keys were previously committed: deleting a file in a new commit does not erase historic exposure.

## Verification note

Source syntax is checked; live MongoDB, Gmail, Firebase and Vercel runtime end-to-end verification cannot be performed without access to your deployment environment. Do not consider email queued as delivered until mailbox/SMTP tests pass.
