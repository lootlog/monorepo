export interface PresenceOrganizationCandidate {
  readonly id: string;
}

export const getPresenceClanKey = (world: string, clanId: number): string =>
  `${world}:${clanId}`;

export const resolvePresenceOrganizationIds = ({
  accessibleOrganizations,
  currentClanKey,
  defaultOrganizationIdByClanKey,
  explicitlySelectedIds,
}: {
  readonly accessibleOrganizations: ReadonlyArray<PresenceOrganizationCandidate>;
  readonly currentClanKey?: string;
  readonly defaultOrganizationIdByClanKey?: Readonly<Record<string, string>>;
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
  if (currentClanKey === undefined) return [];
  const defaultOrganizationId =
    defaultOrganizationIdByClanKey?.[currentClanKey];
  return defaultOrganizationId && accessibleIds.has(defaultOrganizationId)
    ? [defaultOrganizationId]
    : [];
};
