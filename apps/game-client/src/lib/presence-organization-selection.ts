export interface PresenceOrganizationCandidate {
  readonly id: string;
}

export const resolvePresenceOrganizationIds = ({
  accessibleOrganizations,
  currentClanId,
  explicitlySelectedIds,
  preferredOrganizationId,
}: {
  readonly accessibleOrganizations: ReadonlyArray<PresenceOrganizationCandidate>;
  readonly currentClanId?: number;
  readonly explicitlySelectedIds?: ReadonlyArray<string>;
  readonly preferredOrganizationId?: string;
}): string[] => {
  const accessibleIds = new Set(
    accessibleOrganizations.map((organization) => organization.id),
  );
  if (explicitlySelectedIds) {
    return [...new Set(explicitlySelectedIds)].filter((id) =>
      accessibleIds.has(id),
    );
  }
  if (
    currentClanId === undefined ||
    preferredOrganizationId === undefined ||
    !accessibleIds.has(preferredOrganizationId)
  ) {
    return [];
  }
  return [preferredOrganizationId];
};
