import { QueryClient } from "@tanstack/react-query";
import { getBattlesControllerGetUserCharactersQueryKey } from "@lootlog/client/battlelog";
import { describe, expect, it } from "vitest";
import { ensureBattlePanelCharacterId } from "./battle-panel-route-loader";

describe("battle panel character resolution", () => {
  it("returns an explicit character without starting a character-list request", async () => {
    const queryClient = new QueryClient();
    expect(
      await ensureBattlePanelCharacterId({ queryClient, characterId: "42" }),
    ).toBe("42");
    expect(queryClient.isFetching()).toBe(0);
    expect(
      queryClient.getQueryState(
        getBattlesControllerGetUserCharactersQueryKey(),
      ),
    ).toBeUndefined();
    queryClient.clear();
  });

  it("selects the first available character when none was requested", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getBattlesControllerGetUserCharactersQueryKey(), {
      characters: [{ id: "7" }, { id: "8" }],
    });
    expect(await ensureBattlePanelCharacterId({ queryClient })).toBe("7");
    queryClient.clear();
  });

  it("returns no character for an empty account", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(getBattlesControllerGetUserCharactersQueryKey(), {
      characters: [],
    });
    expect(await ensureBattlePanelCharacterId({ queryClient })).toBeUndefined();
    queryClient.clear();
  });
});
