/**
 * How long the page waits for the Discord app to take focus before it opens
 * the profile on the web. Browsers allow a popup only shortly after a click.
 */
const APP_LAUNCH_TIMEOUT_MS = 1000;

export const discordProfileWebUrl = (userId: string) =>
  `https://discord.com/users/${userId}`;

/**
 * Opens a Discord profile in the desktop app, or on the web when the app does
 * not take focus. Phones open the web address, which the installed app claims
 * itself; an unknown scheme there shows an error instead of failing quietly.
 */
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
