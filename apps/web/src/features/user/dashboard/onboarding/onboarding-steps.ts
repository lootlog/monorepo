const ONBOARDING_STEP_IDS = [
  "installAddon",
  "joinOrganization",
  "catchingScope",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type OnboardingStepStatus = "done" | "current" | "upcoming";

export type OnboardingStep = {
  id: OnboardingStepId;
  status: OnboardingStepStatus;
};

type OnboardingSignals = {
  organizationCount: number | undefined;
  lifetimeKills: number | undefined;
  recentBattles: number | undefined;
};

const getGameActivity = (
  lifetimeKills: number | undefined,
  recentBattles: number | undefined,
) => {
  if ((lifetimeKills ?? 0) > 0 || (recentBattles ?? 0) > 0) return true;

  if (lifetimeKills === undefined || recentBattles === undefined) {
    return undefined;
  }

  return false;
};

export const getOnboardingSteps = ({
  organizationCount,
  lifetimeKills,
  recentBattles,
}: OnboardingSignals): OnboardingStep[] | null => {
  if (organizationCount === undefined) return null;

  const hasOrganization = organizationCount > 0;
  const hasGameActivity = getGameActivity(lifetimeKills, recentBattles);

  if (hasOrganization && hasGameActivity !== false) return null;

  const completed: Record<OnboardingStepId, boolean> = {
    installAddon: hasGameActivity === true,
    joinOrganization: hasOrganization,
    catchingScope: false,
  };

  const currentId = ONBOARDING_STEP_IDS.find((id) => !completed[id]);

  return ONBOARDING_STEP_IDS.map((id) => ({
    id,
    status: completed[id] ? "done" : id === currentId ? "current" : "upcoming",
  }));
};
