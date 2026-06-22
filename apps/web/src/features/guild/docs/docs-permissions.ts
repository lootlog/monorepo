export const canWriteGuildDocs = (permissions: readonly string[] | undefined) =>
  Boolean(
    permissions?.includes("LOOTLOG_DOCS_WRITE") ||
    permissions?.includes("ADMIN") ||
    permissions?.includes("OWNER"),
  );

export const canManageGuildDocs = (
  permissions: readonly string[] | undefined,
) => Boolean(permissions?.includes("ADMIN") || permissions?.includes("OWNER"));

export const canReadGuildDocs = (permissions: readonly string[] | undefined) =>
  Boolean(
    permissions?.includes("LOOTLOG_DOCS_READ") ||
    permissions?.includes("LOOTLOG_DOCS_WRITE") ||
    permissions?.includes("ADMIN") ||
    permissions?.includes("OWNER"),
  );
