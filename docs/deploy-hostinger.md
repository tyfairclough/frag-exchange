# Deploying REEFX on Hostinger (Node.js / Next.js)

This app targets Hostinger’s **Node.js** hosting with the **Next.js** preset. Files you deploy should live under the panel’s **Node.js application root** (commonly `~/domains/<your-domain>/nodejs` or as shown in Hostinger’s docs). Do **not** assume you can replace `public_html/.htaccess` manually; follow their routing and preset instructions.

## 1. Prepare the app

- Use the **`web`** folder as the repository root you upload or clone on the server (or copy its contents into the Node.js app directory).
- **Node.js:** use a version Hostinger offers that satisfies `engines` in `package.json` (20–24 LTS range recommended).

## 2. Environment variables (panel)

Add **at least**:

| Variable         | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`   | Neon **pooled** Postgres URL for app runtime, e.g. `postgresql://...-pooler...`. Never commit. Local **`.env.development`** is **ignored in production**; production must get `DATABASE_URL` from this panel. |
| `DIRECT_URL`     | Neon **direct** Postgres URL for Prisma migration/introspection (`prisma migrate deploy`). **Required at build time** — see section 3. |
| `NODE_ENV`       | Usually `production` (often set automatically).                            |

Optional Next defaults apply; add others only when you introduce features that need them.

**Database errors:** If runtime logs show connection/auth errors, verify Hostinger env values use the correct Neon pooled/direct URLs and that SSL params match Neon requirements.

## 3. Build and start commands

Typical Hostinger Next.js preset expectations:

- **Install:** `npm install` (or `npm ci` if you deploy `package-lock.json`).
- **Build:** `npm run build` — runs **`prisma migrate deploy`**, then `prisma generate`, then `next build`. Pending migrations apply automatically on every deploy that runs this script.
- **Start:** `npm run start` — runs `next start` (ensure the panel’s **application port** matches what Next uses, usually `3000`, per Hostinger’s preset).

**Environment at build time:** `DATABASE_URL` and **`DIRECT_URL`** must be available when the panel runs **`npm run build`**, not only at runtime. Shared Hostinger Node.js presets usually inject the same variables for install/build/start — if `migrate deploy` fails during build with a connection error, confirm with support that build jobs see your env, or use the fallbacks in section 4.

If the panel offers a **custom start** field, align it exactly with your `package.json` `start` script.

## 4. Database migrations

**Default (recommended):** Migrations run as part of **`npm run build`** (`prisma migrate deploy` first). No separate SSH step is required — and on **shared hosting**, SSH may **not** allow `npm`/`npx` anyway; running migrate in the build script matches Hostinger’s guidance.

**Manual / SSH (optional):** If you have shell access that can run Node tooling, you can run `npx prisma migrate deploy` from the app root — useful for debugging. It is not required for normal deploys.

**If build cannot reach the database** (env only available at runtime): use a **cron** job from the path Hostinger documents, running the same migrate command once after deploy, or ask Hostinger how to expose `DATABASE_URL` / `DIRECT_URL` during build. A one-off **protected HTTP route** that triggers migrate is possible but high-risk — use only temporarily, then remove.

Do **not** commit `.env`; store secrets only in the panel or your secret manager.

## 5. Database source

Use **Neon Postgres** as the primary database. Prisma schema provider is **`postgresql`** and runtime uses Prisma's native Postgres engine with `DATABASE_URL` (pooled) + `DIRECT_URL` (direct).

## 6. Scheduled housekeeping (Chunk 10)

Background expiry work (90-day listing cleanup, trade expiry + notifications) is exposed at **`/api/cron/housekeeping`**.

1. Set **`CRON_SECRET`** in the panel (long random string).
2. Set **`NEXT_PUBLIC_APP_URL`** (or **`APP_BASE_URL`**) so trade expiry emails contain correct links.
3. In Hostinger **cron**, call periodically (e.g. hourly), for example:

   `curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" "https://yourdomain.com/api/cron/housekeeping"`

   Alternatively, `GET` with `?secret=YOUR_CRON_SECRET` works if your cron job cannot send headers.

The endpoint returns JSON counts (`listingsRemoved`, `tradesExpired`). Without `CRON_SECRET`, it responds **401**.

## 7. Checklist

- [ ] `DATABASE_URL` and **`DIRECT_URL`** set in the Node.js app environment (and available to the **build** step)  
- [ ] `npm run build` succeeds on the server — build logs should show Prisma applying migrations (or “already in sync”) before `next build`  
- [ ] `npm run start` matches panel port / proxy settings  
- [ ] `/api/health` returns `{ "ok": true, "database": "up" }` when DB is reachable  
- [ ] Optional: `CRON_SECRET` + cron hitting `/api/cron/housekeeping` for listing/trade expiry  

**After changing schema:** commit new files under `prisma/migrations/`, deploy — `npm run build` on the server applies any pending migrations.

**If migrate fails during build:** Check that `DATABASE_URL` and `DIRECT_URL` are available to the build job (not only at runtime). If the host cannot provide DB env during build, use a **cron** migrate once or contact Hostinger support — see section 4.

For preset-specific screenshots and port numbers, use Hostinger’s current **Node.js + Next.js** documentation in your control panel.
