import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user)) {
    redirect("/exchanges?error=forbidden");
  }
  return user;
}
