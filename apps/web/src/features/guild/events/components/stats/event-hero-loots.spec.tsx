// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished } from "vitest";
import { createLoot } from "@/lib/testing/loot";
import { createLootTestWrapper } from "@/lib/testing/loot-wrapper";
import { configureApiClients } from "@lootlog/client/transport";
import { EventHeroLoots } from "./event-hero-loots";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
});

describe("EventHeroLoots", () => {
  it("renders recent loots as embedded rows with the action in the header", async () => {
    const requests: URL[] = [];
    onTestFinished(
      configureApiClients({
        main: {
          baseUrl: "https://api.test",
          fetch: async (input) => {
            requests.push(
              new URL(input instanceof Request ? input.url : input.toString()),
            );
            return Response.json([createLoot(1), createLoot(2)]);
          },
        },
      }),
    );
    render(
      <EventHeroLoots
        guildId="guild-one"
        heroNpcNames={["Potulny Berserker"]}
        world="Fobos"
      />,
      { wrapper: await createLootTestWrapper() },
    );

    await screen.findAllByTestId("loot-list-item");
    const action = screen.getByRole("link", { name: "events.loots.showAll" });

    expect(action.closest("header")).toBeTruthy();
    const target = new URL(
      action.getAttribute("href") ?? "",
      "https://web.test",
    );
    expect(target.pathname).toBe("/guild-one");
    expect(target.searchParams.get("npcs")).toBe("Potulny Berserker");
    expect(action.getAttribute("class")).toContain("hover:text-primary");
    expect(action.getAttribute("class")).not.toContain("hover:bg-");
    expect(
      screen
        .getAllByTestId("loot-list-item")
        .map((row) => row.dataset.presentation),
    ).toEqual(["embedded", "embedded"]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(requests[0]?.searchParams.get("limit")).toBe("10");
  });
});
