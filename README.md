# REEFX (web)

Next.js app for **REEFX** (reefx.net): mobile-first shell, **MySQL** via **Prisma 7**, aligned with a **Hostinger Node.js** deployment (Next.js preset).

Runtime DB access uses Prisma’s **`@prisma/adapter-mariadb`** driver with the [`mariadb`](https://www.npmjs.com/package/mariadb) client (MySQL-compatible; same `mysql://…` `DATABASE_URL` as in Prisma’s docs).

**MySQL only:** the Prisma schema uses `provider = "mysql"`. Do not use PostgreSQL or `prisma+postgres://` URLs. The `postgres` package may appear under `node_modules` as a **transitive dependency of the Prisma CLI**; the app runtime does not connect to Postgres.
UI is built with **Tailwind CSS + daisyUI** (`daisyui` plugin in `globals.css`) using custom themes: `fraglight` and `fragdark`.

## Requirements

- **Node.js** 20–24 (see `engines` in `package.json`)
- **Docker Desktop** (Windows/Mac) or **Docker Engine + Compose** (Linux), for the bundled local MySQL
- **MySQL** 8.x — or use the Docker setup below; production can use Hostinger or any reachable instance

## Local setup

1. **Environment**

   ```bash
   cp .env.example .env
   ```

   **Database URL:** committed **`.env.development`** points Prisma/Next at the local Docker MySQL (`frag` / `fraglocaldev` / `frag_exchange` on `127.0.0.1:3306`). It is loaded only when you run **`npm run dev`** (`NODE_ENV=development`). Add optional keys (Mailtrap, etc.) to `.env` or `.env.local`. App-specific secrets use the **`REEFX_*`** prefix (see `.env.example`).

   **Production** on Hostinger: set **`DATABASE_URL`** in the Node.js app environment — `.env.development` is not used when `NODE_ENV=production`.

2. **Local MySQL (Docker)**

   From the `web/` directory:

   ```bash
   npm run db:up
   ```

   Wait until the container is healthy (first start can take ~30s). Stop the database with `npm run db:down` (data persists in the `frag_exchange_mysql_data` volume until you remove it with `docker compose down -v`).

   If port **3306** is already in use, edit `docker-compose.yml` to map e.g. `3307:3306` and set `DATABASE_URL` to use port `3307`.

3. **Install and database**

   ```bash
   npm install
   npm run db:migrate:dev
   ```

   `postinstall` runs `prisma generate` so the client matches the schema after installs.

   **Prisma P3014 (shadow database):** Local dev uses **`PRISMA_SHADOW_DATABASE_URL`** in `.env.development` (MySQL `root` + empty database **`prisma_shadow`**), so Migrate does not rely on `frag` creating random shadow DBs. Ensure that DB exists: new containers run `docker/mysql/99-prisma-migrate-grants.sql` on **first** init; for an older volume run **`npm run db:grant`** once while MySQL is up. Then **`npm run db:migrate:dev`**. To reset everything: `docker compose down -v` and `npm run db:up` (wipes local data).

4. **Run**

   ```bash
   npm run dev
   ```

   - App: [http://localhost:3111](http://localhost:3111) (port **3111** to avoid clashing with 3000 and 3001–3010)
   - Health (includes DB ping): [http://localhost:3111/api/health](http://localhost:3111/api/health)

## Scripts

| Script               | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Next dev server                              |
| `npm run build`      | `prisma generate` + production Next build   |
| `npm run start`      | Production server (`next start`)             |
| `npm run db:migrate` | `prisma migrate deploy` (CI / production)   |
| `npm run db:migrate:dev` | Create/apply migrations in development |
| `npm run db:up`          | Start local MySQL (Docker Compose)        |
| `npm run db:down`        | Stop local MySQL containers               |
| `npm run db:grant` | Grant `frag` shadow-DB rights (existing volumes only; see P3014 note above) |
| `npm run db:grant-migrate` | Same as `db:grant` |

## UI conventions (Tailwind + daisyUI)

- Use **daisyUI component classes** first for standard UI patterns (`btn`, `card`, `skeleton`, `alert`, form controls).
- Use **Tailwind utilities** for layout and one-off spacing/sizing (`flex`, `grid`, `gap-*`, `px-*`, responsive tweaks).
- Keep app colors on semantic tokens (`primary`, `base-*`, `neutral`) instead of hard-coded hex values in components.
- Theme definitions live in `src/app/globals.css` under `@plugin "daisyui/theme"` blocks (`fraglight`, `fragdark`).

## Deploy (Hostinger)

See **[docs/deploy-hostinger.md](./docs/deploy-hostinger.md)** for panel settings, `DATABASE_URL`, build/start commands, and running migrations on deploy.

**Coral photos:** uploads are written under `public/coral-uploads/{userId}/` at runtime. Ensure that path exists on the server and is writable by the Node process, and that it is preserved across deploys (otherwise user images are lost when the app directory is replaced).

## Project layout (Chunk 1)

- `src/app/(main)/` — routed UI inside the app shell (home, explore, me placeholders)
- `src/app/api/health` — JSON health check with MySQL connectivity
- `prisma/` — schema and migrations (`users` baseline table)
