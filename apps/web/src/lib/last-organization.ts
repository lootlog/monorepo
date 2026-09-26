const storageKey = (userId: string) =>
  `lootlog:user:${userId}:last-organization`;

export const getLastOrganization = (userId: string): string | null => {
  try {
    const guildId = localStorage.getItem(storageKey(userId));

    return guildId && /^\d+$/.test(guildId) ? guildId : null;
  } catch {
    return null;
  }
};

export const rememberOrganization = (userId: string, guildId: string) => {
  try {
    const key = storageKey(userId);

    if (localStorage.getItem(key) !== guildId) {
      localStorage.setItem(key, guildId);
    }
  } catch {
    // Remembering navigation is optional when browser storage is unavailable.
  }
};

export const forgetLastOrganization = (userId: string, guildId: string) => {
  try {
    const key = storageKey(userId);

    // Another tab may have selected a different organization during the lookup.
    if (localStorage.getItem(key) === guildId) {
      localStorage.removeItem(key);
    }
  } catch {
    // A storage failure must not prevent returning to the dashboard.
  }
};
