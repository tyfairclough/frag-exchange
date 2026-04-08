# Deploying REEFX on Hostinger (Node.js / Next.js)

This app targets Hostinger’s **Node.js** hosting with the **Next.js** preset. Files you deploy should live under the panel’s **Node.js application root** (commonly `~/domains/<your-domain>/nodejs` or as shown in Hostinger’s docs). Do **not** assume you can replace `public_html/.htaccess` manually; follow their routing and preset instructions.

## 1. Prepare the app

- Use the **`web`** folder as the repository root you upload or clone on the server (or copy its contents into the Node.js app directory).
- **Node.js:** use a version Hostinger offers that satisfies `engines` in `package.json` (20–24 LTS range recommended).

## 2. Environment variables (panel)

Add **at least**:

| Variable         | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`   | **MySQL only** — `mysql://USER:PASSWORD@HOST:3306/DATABASE`. Do not use PostgreSQL or `prisma+postgres://`. Never commit. Local **`.env.development`** (Docker URL) is **ignored in production**; production must get `DATABASE_URL` from this panel. |
| `NODE_ENV`       | Usually `production` (often set automatically).                            |
| `DATABASE_POOL_CONNECTION_LIMIT` | Optional. Overrides the built-in **production** default of **`5`** connections (when `connectionLimit` is not already in `DATABASE_URL`). |
| `DATABASE_POOL_MINIMUM_IDLE` | Optional. Overrides **`minimumIdle`**; production defaults to **`0`** (lazy pool) when not in the URL. |

Optional Next defaults apply; add others only when you introduce features that need them.

**MySQL pool errors:** If runtime logs show `pool timeout … active=0 idle=0`, the DB user or server is refusing new connections or the account hit **process limits** (SSH may show `fork: Resource temporarily unavailable`). After redeploying the app, errors should show `limit=5` if production pool defaults are active. If problems remain, lower further (`connectionLimit=3` on the URL), stop other sites using the same MySQL user, and reduce **max processes** load (Joomla/cron/duplicate Node apps).

## 3. Build and start commands

Typical Hostinger Next.js preset expectations:

- **Install:** `npm install` (or `npm ci` if you deploy `package-lock.json`).
- **Build:** `npm run build` — this runs `prisma generate` then `next build`.
- **Start:** `npm run start` — runs `next start` (ensure the panel’s **application port** matches what Next uses, usually `3000`, per Hostinger’s preset).

If the panel offers a **custom start** field, align it exactly with your `package.json` `start` script.

## 4. Database migrations

After the first deploy (or whenever migrations change), apply the schema to MySQL:

```bash
npx prisma migrate deploy
```

Run this from the same directory as `package.json`, with `DATABASE_URL` set to the **production** database. Options:

- SSH into the host and run the command once per release, or
- A one-off “deploy job” / cron step if Hostinger documents that pattern.

Do **not** commit `.env`; store secrets only in the panel or your secret manager.

## 5. MySQL source

Use **Hostinger managed MySQL** or any MySQL instance reachable from the Node process. The Prisma schema provider is **`mysql`**; Prisma 7 connects at runtime through **`@prisma/adapter-mariadb`** and the **`mariadb`** npm package (works with standard MySQL servers using your existing `mysql://…` URL).

## 6. Scheduled housekeeping (Chunk 10)

Background expiry work (90-day listing cleanup, trade expiry + notifications) is exposed at **`/api/cron/housekeeping`**.

1. Set **`CRON_SECRET`** in the panel (long random string).
2. Set **`NEXT_PUBLIC_APP_URL`** (or **`APP_BASE_URL`**) so trade expiry emails contain correct links.
3. In Hostinger **cron**, call periodically (e.g. hourly), for example:

   `curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" "https://yourdomain.com/api/cron/housekeeping"`

   Alternatively, `GET` with `?secret=YOUR_CRON_SECRET` works if your cron job cannot send headers.

The endpoint returns JSON counts (`listingsRemoved`, `tradesExpired`). Without `CRON_SECRET`, it responds **401**.

## 7. Checklist

- [ ] `DATABASE_URL` set in the Node.js app environment  
- [ ] `npm run build` succeeds on the server  
- [ ] `npx prisma migrate deploy` applied against production MySQL  
- [ ] `npm run start` matches panel port / proxy settings  
- [ ] `/api/health` returns `{ "ok": true, "database": "up" }` when DB is reachable  
- [ ] Optional: `CRON_SECRET` + cron hitting `/api/cron/housekeeping` for listing/trade expiry  

For preset-specific screenshots and port numbers, use Hostinger’s current **Node.js + Next.js** documentation in your control panel.
