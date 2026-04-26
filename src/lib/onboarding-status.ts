type OnboardingUser = {
  onboardingCompletedAt: Date | null;
  tosAcceptedAt: Date | null;
  privacyAcceptedAt: Date | null;
};

export function hasCompletedRequiredOnboarding(user: OnboardingUser): boolean {
  return Boolean(user.onboardingCompletedAt && user.tosAcceptedAt && user.privacyAcceptedAt);
}

