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
  } catch {}
};

export const rememberPersonalPanel = (userId: string) => {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {}
};

export const forgetLastOrganization = (userId: string, guildId: string) => {
  try {
    const key = storageKey(userId);

    if (localStorage.getItem(key) === guildId) {
      localStorage.removeItem(key);
    }
  } catch {}
};
