import test from "node:test";
import assert from "node:assert/strict";
import { hasCompletedRequiredOnboarding } from "@/lib/onboarding-status";

test("returns true when onboarding and legal acceptance are complete", () => {
  const now = new Date();
  assert.equal(
    hasCompletedRequiredOnboarding({
      onboardingCompletedAt: now,
      tosAcceptedAt: now,
      privacyAcceptedAt: now,
    }),
    true,
  );
});

test("returns false when legal acceptance is missing", () => {
  const now = new Date();
  assert.equal(
    hasCompletedRequiredOnboarding({
      onboardingCompletedAt: now,
      tosAcceptedAt: null,
      privacyAcceptedAt: now,
    }),
    false,
  );
});

