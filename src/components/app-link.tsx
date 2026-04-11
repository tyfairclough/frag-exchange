"use client";

import Link from "next/link";
import { useDatabaseBootReady } from "@/components/database-boot-context";

type AppLinkProps = React.ComponentProps<typeof Link>;

/**
 * Like `next/link`, but disables prefetch until the database boot gate reports ready
 * (reduces parallel RSC prefetches against a cold Neon).
 */
export function AppLink({ prefetch, ...rest }: AppLinkProps) {
  const ready = useDatabaseBootReady();
  return <Link {...rest} prefetch={ready ? prefetch : false} />;
}
