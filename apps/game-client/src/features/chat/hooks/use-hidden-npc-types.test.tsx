import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import {
  getHiddenNpcTypesFromSettingsDocuments,
  updateHiddenNpcTypesInSettingsDocuments,
} from "@/hooks/api/use-settings-documents";
import { useHiddenNpcTypes } from "./use-hidden-npc-types";

const chatQueryKey = getSettingsDocumentsControllerGetPreferencesQueryKey({
  domains: "chat",
});

const settingsDocuments: SettingsDocumentsResponseDtoOutput = {
  domains: {
    chat: {
      effective: { hiddenNpcTypes: [] },
      layers: [],
      sources: {},
      schemaVersion: 1,
    },
  },
};

describe("useHiddenNpcTypes", () => {
  it("merges writes from two consumers issued before the first PATCH resolves", async () => {
    const harness = createGuildPreferencesTest();
    harness.queryClient.setQueryData(chatQueryKey, settingsDocuments);
    const patchBodies: string[] = [];
    const resolvers: Array<(value: Response) => void> = [];
    harness.request.mockImplementation((_input, init) => {
      patchBodies.push(String(init?.body));

      return new Promise<Response>((resolve) => resolvers.push(resolve));
    });

    const respond = (body: string) =>
      resolvers.shift()?.(
        Response.json(
          updateHiddenNpcTypesInSettingsDocuments(
            settingsDocuments,
            JSON.parse(body).operations[0].set.hiddenNpcTypes,
          ),
        ),
      );

    const settingsPanel = renderHook(() => useHiddenNpcTypes(), {
      wrapper: harness.wrapper,
    });

    const contextMenu = renderHook(() => useHiddenNpcTypes(), {
      wrapper: harness.wrapper,
    });

    act(() => {
      settingsPanel.result.current.setNpcTypeVisible(NpcTypeEnum.ELITE2, false);
      contextMenu.result.current.setNpcTypeVisible(NpcTypeEnum.TITAN, false);
    });
    await waitFor(() => expect(patchBodies).toHaveLength(1));
    expect(
      JSON.parse(patchBodies[0]!).operations[0].set.hiddenNpcTypes,
    ).toEqual(["ELITE2"]);

    respond(patchBodies[0]!);
    await waitFor(() => expect(patchBodies).toHaveLength(2));
    expect(
      JSON.parse(patchBodies[1]!).operations[0].set.hiddenNpcTypes,
    ).toEqual(["ELITE2", "TITAN"]);
    // The first response must not roll back the second optimistic write.
    expect(
      getHiddenNpcTypesFromSettingsDocuments(
        harness.queryClient.getQueryData(chatQueryKey),
      ),
    ).toEqual(["ELITE2", "TITAN"]);

    respond(patchBodies[1]!);
    await waitFor(() =>
      expect([...contextMenu.result.current.hiddenNpcTypes]).toEqual([
        "ELITE2",
        "TITAN",
      ]),
    );
  });
});
