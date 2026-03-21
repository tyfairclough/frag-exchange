# Frag Exchange (web)

Next.js app for **Frag Exchange**: mobile-first shell, **MySQL** via **Prisma 7**, aligned with a **Hostinger Node.js** deployment (Next.js preset).

Runtime DB access uses Prisma’s **`@prisma/adapter-mariadb`** driver with the [`mariadb`](https://www.npmjs.com/package/mariadb) client (MySQL-compatible; same `mysql://…` `DATABASE_URL` as in Prisma’s docs).

**MySQL only:** the Prisma schema uses `provider = "mysql"`. Do not use PostgreSQL or `prisma+postgres://` URLs. The `postgres` package may appear under `node_modules` as a **transitive dependency of the Prisma CLI**; the app runtime does not connect to Postgres.
UI is built with **Tailwind CSS + daisyUI** (`daisyui` plugin in `globals.css`) using custom themes: `fraglight` and `fragdark`.

## Requirements

- **Node.js** 20–24 (see `engines` in `package.json`)
- **MySQL** 8.x (local Docker, Hostinger managed MySQL, or any reachable instance)

## Local setup

1. **Environment**

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` to a MySQL URL Prisma accepts, for example:

   `mysql://USER:PASSWORD@127.0.0.1:3306/frag_exchange`

2. **Install and database**

   ```bash
   npm install
   npx prisma migrate dev
   ```

   `postinstall` runs `prisma generate` so the client matches the schema after installs.

3. **Run**

   ```bash
   npm run dev
   ```

   - App: [http://localhost:3000](http://localhost:3000)
   - Health (includes DB ping): [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Scripts

| Script               | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Next dev server                              |
| `npm run build`      | `prisma generate` + production Next build   |
| `npm run start`      | Production server (`next start`)             |
| `npm run db:migrate` | `prisma migrate deploy` (CI / production)   |
| `npm run db:migrate:dev` | Create/apply migrations in development |

## UI conventions (Tailwind + daisyUI)

- Use **daisyUI component classes** first for standard UI patterns (`btn`, `card`, `skeleton`, `alert`, form controls).
- Use **Tailwind utilities** for layout and one-off spacing/sizing (`flex`, `grid`, `gap-*`, `px-*`, responsive tweaks).
- Keep app colors on semantic tokens (`primary`, `base-*`, `neutral`) instead of hard-coded hex values in components.
- Theme definitions live in `src/app/globals.css` under `@plugin "daisyui/theme"` blocks (`fraglight`, `fragdark`).

## Deploy (Hostinger)

See **[docs/deploy-hostinger.md](./docs/deploy-hostinger.md)** for panel settings, `DATABASE_URL`, build/start commands, and running migrations on deploy.

## Project layout (Chunk 1)

- `src/app/(main)/` — routed UI inside the app shell (home, explore, me placeholders)
- `src/app/api/health` — JSON health check with MySQL connectivity
- `prisma/` — schema and migrations (`users` baseline table)
