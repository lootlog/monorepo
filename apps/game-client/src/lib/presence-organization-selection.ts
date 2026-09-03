export interface PresenceOrganizationCandidate {
  readonly id: string;
}

export const resolvePresenceOrganizationIds = ({
  accessibleOrganizations,
  explicitlySelectedIds,
}: {
  readonly accessibleOrganizations: ReadonlyArray<PresenceOrganizationCandidate>;
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
  return accessibleOrganizations.length === 1
    ? [accessibleOrganizations[0].id]
    : [];
};
