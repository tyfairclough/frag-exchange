# REEFxCHANGE (web)

Next.js app for **REEFxCHANGE** (reefx.net): mobile-first shell with **Neon Postgres** via **Prisma 7**, aligned with a **Hostinger Node.js** deployment (Next.js preset).

Runtime DB access uses Prisma's native Postgres engine with `DATABASE_URL` (Neon pooled URL) and `DIRECT_URL` (Neon direct URL for migrations).
UI is built with **Tailwind CSS + daisyUI** (`daisyui` plugin in `globals.css`) using custom themes: `fraglight` and `fragdark`.

## Requirements

- **Node.js** 20–24 (see `engines` in `package.json`)
- **Docker Desktop** (Windows/Mac) or **Docker Engine + Compose** (Linux), for bundled local **Postgres 17** (Docker Compose)
- **Production:** Neon Postgres (plus Hostinger Node.js hosting)

## Local setup

1. **Environment**

   ```bash
   cp .env.example .env
   ```

   **Database URL:** create **`.env.development`** from `.env.example` (dev block). Recommended local workflow is a dedicated Neon branch (for example `dev-local`) with:
   - `DATABASE_URL` = pooled URL for that branch
   - `DIRECT_URL` = direct URL for that branch
   It is loaded only when you run **`npm run dev`** (`NODE_ENV=development`). Add optional keys (Mailtrap, etc.) to `.env` or `.env.local`. App-specific secrets use the **`REEFX_*`** prefix (see `.env.example`).

   **Production** on Hostinger: set **`DATABASE_URL`** and **`DIRECT_URL`** in the Node.js app environment — `.env.development` is not used when `NODE_ENV=production`.

2. **Local DB options**

   **Option A (recommended): Neon branch parity**
   - Keep one long-lived branch (e.g. `dev-local`) cloned from production.
   - Use Neon pooled/direct URLs for that branch in `.env.development`.
   - This keeps local behavior close to hosted production.

   **Option B: Local Docker Postgres fallback**

   From the app root (`frag-exchange/`):

   ```bash
   npm run db:up
   ```

   Wait until the container is healthy (first start can take ~30s). Stop the database with `npm run db:down` (data persists in the `frag_exchange_postgres_data` volume until you remove it with `docker compose down -v`).

   If port **5432** is already in use, edit `docker-compose.yml` to map e.g. `5433:5432` and set `DATABASE_URL` to use port `5433`.

3. **Install and database**

   ```bash
   npm install
   npm run db:migrate:dev
   ```

   `postinstall` runs `prisma generate` so the client matches the schema after installs.

   Local Postgres migration does not require `PRISMA_SHADOW_DATABASE_URL`.
   For Neon branch development, `npm run db:migrate:dev` runs against your branch via `DIRECT_URL`.

4. **Run**

   ```bash
   npm run dev
   ```

   - App: [http://localhost:3111](http://localhost:3111) (port **3111** to avoid clashing with 3000 and 3001–3010)
   - Liveness (process only): [http://localhost:3111/api/live](http://localhost:3111/api/live)
   - Readiness (includes DB ping): [http://localhost:3111/api/health](http://localhost:3111/api/health)

## Scripts

| Script               | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Next dev server                              |
| `npm run build`      | `prisma migrate deploy`, then `prisma generate` + production Next build (needs DB env; Hostinger deploy) |
| `npm run build:no-migrate` | `prisma generate` + Next build only (e.g. CI without DB) |
| `npm run start`      | Production server (`next start`)             |
| `npm run db:migrate` | `prisma migrate deploy` (also invoked by `build`) |
| `npm run db:migrate:dev` | Create/apply migrations in development |
| `npm run db:up`          | Start local Postgres (Docker Compose)       |
| `npm run db:down`        | Stop local database containers               |
| `npm run db:migrate:docker-to-neon` | Copy data from Docker MariaDB source into Neon Postgres |

## UI conventions (Tailwind + daisyUI)

- Use **daisyUI component classes** first for standard UI patterns (`btn`, `card`, `skeleton`, `alert`, form controls).
- Use **Tailwind utilities** for layout and one-off spacing/sizing (`flex`, `grid`, `gap-*`, `px-*`, responsive tweaks).
- Keep app colors on semantic tokens (`primary`, `base-*`, `neutral`) instead of hard-coded hex values in components.
- Theme definitions live in `src/app/globals.css` under `@plugin "daisyui/theme"` blocks (`fraglight`, `fragdark`).

## Deploy (Hostinger)

See **[docs/deploy-hostinger.md](./docs/deploy-hostinger.md)** for panel settings, `DATABASE_URL` / `DIRECT_URL` at **build** time, and build/start commands. **`npm run build`** applies pending Prisma migrations before compiling Next — no separate SSH migrate step on shared hosting.

## Neon branch reset workflow

- Recommended model:
  - Keep `dev-local` persistent for normal daily development.
  - Reset from production only when branch data has drifted too far.
- Reset command (Neon MCP): `reset_from_parent` on branch `dev-local`.
- Optional safe reset:
  - pass `preserveUnderName` to snapshot current branch state before reset.
- After reset:
  - run local smoke checks (`/api/health`, login, exchange create/edit, trade read/write).

**Coral photos:** uploads are written under `public/coral-uploads/{userId}/` at runtime. Ensure that path exists on the server and is writable by the Node process, and that it is preserved across deploys (otherwise user images are lost when the app directory is replaced).

## Project layout (Chunk 1)

- `src/app/(main)/` — routed UI inside the app shell (home, explore, me placeholders)
- `src/app/api/live` — JSON liveness check (process-only, no DB dependency)
- `src/app/api/health` — JSON readiness check with database connectivity
- `prisma/` — schema and migrations (`users` baseline table)
