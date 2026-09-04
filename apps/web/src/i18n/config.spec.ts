import { expect, it } from "vitest";
import i18n, { loadAuthenticatedTranslations } from "./config";

it("makes deferred settings and events available before authenticated rendering", async () => {
  expect(i18n.exists("common.routeErrors.global.description")).toBe(true);
  expect(i18n.exists("settings.guildNavigation.general")).toBe(false);
  expect(i18n.exists("events.sidebarBanner.pinnedEvent")).toBe(false);
  const first = loadAuthenticatedTranslations();
  expect(loadAuthenticatedTranslations()).toBe(first);
  await first;
  expect(i18n.t("settings.guildNavigation.general")).not.toBe(
    "settings.guildNavigation.general",
  );
  expect(i18n.t("events.sidebarBanner.pinnedEvent")).not.toBe(
    "events.sidebarBanner.pinnedEvent",
  );
  expect(i18n.exists("common.routeErrors.global.description")).toBe(true);
});
