export interface PresenceOrganizationCandidate {
  readonly id: string;
  readonly margonemClanIds?: ReadonlyArray<number>;
}

export const resolvePresenceOrganizationIds = ({
  accessibleOrganizations,
  currentClanId,
  explicitlySelectedIds,
}: {
  readonly accessibleOrganizations: ReadonlyArray<PresenceOrganizationCandidate>;
  readonly currentClanId?: number;
  readonly explicitlySelectedIds?: ReadonlyArray<string>;
}): string[] => {
  const accessibleIds = new Set(
    accessibleOrganizations.map((organization) => organization.id),
  );
  if (explicitlySelectedIds) {
    return [...new Set(explicitlySelectedIds)].filter((id) =>
      accessibleIds.has(id),
    );
  }
  if (currentClanId === undefined) return [];
  return accessibleOrganizations
    .filter((organization) =>
      organization.margonemClanIds?.includes(currentClanId),
    )
    .map((organization) => organization.id);
};
