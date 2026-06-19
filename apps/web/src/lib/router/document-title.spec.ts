import { describe, expect, it } from "vitest";
import {
  resolveDocumentTitle,
  type DocumentTitleMatch,
} from "./document-title";

function createMatch(
  overrides: Partial<DocumentTitleMatch>,
): DocumentTitleMatch {
  return {
    params: {},
    pathname: "/",
    routeId: "__root__",
    status: "success",
    ...overrides,
  };
}

describe("resolveDocumentTitle", () => {
  it("uses the sign in title for the public auth route", () => {
    expect(
      resolveDocumentTitle([
        createMatch({ routeId: "__root__" }),
        createMatch({ pathname: "/signin", routeId: "/signin" }),
      ]),
    ).toBe("Logowanie | Lootlog.pl");
  });

  it("uses user breadcrumbs with the top-level section as context", () => {
    expect(
      resolveDocumentTitle([
        createMatch({ routeId: "__root__" }),
        createMatch({
          pathname: "/@me/battle-panel/statistics/h2h",
          routeId: "/_authenticated/@me/battle-panel/statistics_/h2h",
        }),
      ]),
    ).toBe("Bilans H2H - Panel walk | Lootlog.pl");
  });

  it("uses the guild name as context for regular guild pages", () => {
    expect(
      resolveDocumentTitle([
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1" },
          pathname: "/guild-1/timers",
          routeId: "/_authenticated/$guildId/timers",
        }),
      ]),
    ).toBe("Timery - Nocna Straż | Lootlog.pl");
  });

  it("uses specific titles for guild stats child pages", () => {
    expect(
      resolveDocumentTitle([
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1" },
          pathname: "/guild-1/stats/kills",
          routeId: "/_authenticated/$guildId/stats/kills",
        }),
      ]),
    ).toBe("Statystyki killi - Nocna Straż | Lootlog.pl");

    expect(
      resolveDocumentTitle([
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1" },
          pathname: "/guild-1/stats/loots",
          routeId: "/_authenticated/$guildId/stats/loots",
        }),
      ]),
    ).toBe("Statystyki lootów - Nocna Straż | Lootlog.pl");
  });

  it("treats trailing slashes as the same guild page", () => {
    expect(
      resolveDocumentTitle([
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1" },
          pathname: "/guild-1/reservations/",
          routeId: "/_authenticated/$guildId/reservations/",
        }),
      ]),
    ).toBe("Rezerwacje - Nocna Straż | Lootlog.pl");
  });

  it("uses the event name as context for event child pages", () => {
    expect(
      resolveDocumentTitle([
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          loaderData: {
            event: { name: "Letni event", heroNpcs: [] },
            rankings: [],
          },
          params: { eventId: "event-1", guildId: "guild-1" },
          pathname: "/guild-1/events/event-1",
          routeId: "/_authenticated/$guildId/events_/$eventId_",
        }),
        createMatch({
          params: { eventId: "event-1", guildId: "guild-1" },
          pathname: "/guild-1/events/event-1/ranking",
          routeId: "/_authenticated/$guildId/events_/$eventId_/ranking",
        }),
      ]),
    ).toBe("Ranking - Letni event | Lootlog.pl");
  });

  it("uses the event name as context for the coordination route", () => {
    expect(
      resolveDocumentTitle([
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          loaderData: {
            event: { name: "Letni event", heroNpcs: [] },
            rankings: [],
          },
          params: { eventId: "event-1", guildId: "guild-1" },
          pathname: "/guild-1/events/event-1",
          routeId: "/_authenticated/$guildId/events_/$eventId_",
        }),
        createMatch({
          params: { eventId: "event-1", guildId: "guild-1" },
          pathname: "/guild-1/events/event-1/coordination",
          routeId: "/_authenticated/$guildId/events_/$eventId_/coordination",
        }),
      ]),
    ).toBe("Koordynator - Letni event | Lootlog.pl");
  });

  it("uses fallback detail labels when loader data does not include a name", () => {
    expect(
      resolveDocumentTitle([
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1", memberId: "123" },
          pathname: "/guild-1/stats/members/123",
          routeId: "/_authenticated/$guildId/stats/members/$memberId",
        }),
      ]),
    ).toBe("Członek #123 | Lootlog.pl");
  });

  it("uses the not found title for not found route matches", () => {
    expect(
      resolveDocumentTitle([
        createMatch({ routeId: "__root__" }),
        createMatch({
          pathname: "/missing",
          routeId: "/missing",
          status: "notFound",
        }),
      ]),
    ).toBe("Nie znaleziono strony | Lootlog.pl");
  });
});
