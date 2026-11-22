const APP_LAUNCH_TIMEOUT_MS = 1000;

export const discordProfileWebUrl = (userId: string) =>
  `https://discord.com/users/${userId}`;

export const openDiscordProfile = (userId: string) => {
  const webUrl = discordProfileWebUrl(userId);
  const openWeb = () => window.open(webUrl, "_blank", "noopener,noreferrer");

  if (window.matchMedia("(pointer: coarse)").matches) {
    openWeb();

    return;
  }

  let appOpened = false;

  const markOpened = () => {
    appOpened = true;
  };

  window.addEventListener("blur", markOpened);
  document.addEventListener("visibilitychange", markOpened);

  window.location.href = `discord://-/users/${userId}`;

  window.setTimeout(() => {
    window.removeEventListener("blur", markOpened);
    document.removeEventListener("visibilitychange", markOpened);

    if (!appOpened) openWeb();
  }, APP_LAUNCH_TIMEOUT_MS);
};
