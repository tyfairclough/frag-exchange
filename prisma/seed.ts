import dotenv from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserGlobalRole } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/lib/password";

dotenv.config({ path: ".env" });
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.development" });
}
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set; cannot seed.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
});

async function main() {
  const superCount = await prisma.user.count({
    where: { globalRole: UserGlobalRole.SUPER_ADMIN },
  });
  if (superCount > 0) {
    console.log("Seed skipped: at least one super admin already exists.");
    return;
  }

  const email = process.env.FRAG_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.FRAG_BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !email.includes("@") || !password) {
    console.error(
      "No super admin in the database. Set FRAG_BOOTSTRAP_ADMIN_EMAIL and FRAG_BOOTSTRAP_ADMIN_PASSWORD in .env, then run: npx prisma db seed",
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      globalRole: UserGlobalRole.SUPER_ADMIN,
      passwordHash,
    },
    update: {
      globalRole: UserGlobalRole.SUPER_ADMIN,
      passwordHash,
    },
  });

  console.log(`Bootstrap super admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
