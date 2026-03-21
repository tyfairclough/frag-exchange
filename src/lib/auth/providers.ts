/**
 * Sign-in providers: magic link is live; OAuth SSO is registered here for a single integration point later.
 */
export type AuthProviderId = "magic-link" | "google";

export type AuthProviderKind = "email_otp" | "oauth";

export interface AuthProviderDefinition {
  id: AuthProviderId;
  kind: AuthProviderKind;
  label: string;
  description: string;
  enabled: boolean;
}

export const AUTH_PROVIDERS: readonly AuthProviderDefinition[] = [
  {
    id: "magic-link",
    kind: "email_otp",
    label: "Email magic link",
    description: "We email you a one-time sign-in link.",
    enabled: true,
  },
  {
    id: "google",
    kind: "oauth",
    label: "Google",
    description: "SSO via Google — wire NextAuth or similar behind this id.",
    enabled: false,
  },
] as const;

export function getEnabledAuthProviders(): AuthProviderDefinition[] {
  return AUTH_PROVIDERS.filter((p) => p.enabled);
}

export function getSecondaryAuthProviders(): AuthProviderDefinition[] {
  return AUTH_PROVIDERS.filter((p) => !p.enabled);
}
