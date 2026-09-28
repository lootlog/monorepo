import { createNotificationsResponse } from "@/test/game-account-preferences-fixtures";
import { act, renderHook } from "@testing-library/react";
import {
  accountPreferenceValues,
  createSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import { describe, expect, it } from "vitest";
import type { UserGameAccountPreferencesResponseDtoOutput } from "@lootlog/client/main";
import { createDetectorSettings } from "@/lib/game-account-preferences";
import { createAirTagTest } from "./air-tag-test";
import { airTagReceiveController } from "./air-tag-receive-controller";
import { useAirTags } from "./use-air-tags";

const settings = (
  enabled: boolean,
): UserGameAccountPreferencesResponseDtoOutput => ({
  accountId: "202",
  notifications: createNotificationsResponse(),
  detector: createDetectorSettings(),
  pings: { enabled: false },
  airTags: { enabled },
  hasStoredNotifications: true,
  hasStoredDetector: true,
  hasStoredPings: true,
  hasStoredAirTags: true,
  hasStoredPreferences: true,
});

const update = {
  v: 1 as const,
  type: "air-tag.updated" as const,
  data: {
    guildId: "guild-1",
    world: "fobos",
    mapId: 12,
    epochId: "epoch",
    epochStartedAt: 100,
    revision: 2,
    target: {
      targetId: "guild-1",
      nickname: "Target",
      relation: 1 as const,
      x: 20,
      y: 20,
      observedAt: Date.now(),
    },
  },
};

describe("useAirTags", () => {
  it("ignores incoming targets and sends no subscription while disabled", async () => {
    const test = createAirTagTest();
    seedSettingsDocuments(
      test.queryClient,
      createSettingsDocuments(accountPreferenceValues(settings(false))),
    );
    const view = renderHook(() => useAirTags(), { wrapper: test.wrapper });
    await test.join();
    await test.receive(update);
    expect(test.subscriptions()).toHaveLength(0);
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([]);
    view.unmount();
    expect(test.subscriptions()).toHaveLength(0);
  });
  it("applies updates only while ready and clears state on unmount", async () => {
    const test = createAirTagTest();
    seedSettingsDocuments(
      test.queryClient,
      createSettingsDocuments(accountPreferenceValues(settings(true))),
    );
    const view = renderHook(() => useAirTags(), { wrapper: test.wrapper });
    await test.join();
    expect(
      test.wire.frames.filter(
        (frame) => "type" in frame && frame.type === "presence.publish",
      ),
    ).toHaveLength(1);
    await test.acknowledge(["guild-1"]);
    await test.receive(update);
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([expect.objectContaining({ targetId: "guild-1", x: 20 })]);
    const { target, ...scope } = update.data;
    await test.receive({
      v: 1,
      type: "air-tag.scope-updated",
      data: {
        ...scope,
        revision: 3,
        targets: [{ ...target, targetId: "guild-2", x: 30 }],
        removedTargetIds: ["guild-1"],
      },
    });
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([expect.objectContaining({ targetId: "guild-2", x: 30 })]);
    act(() => test.wire.close());
    await act(() =>
      test.wire.receive({
        ...update,
        data: {
          ...update.data,
          revision: 4,
          target: { ...update.data.target, x: 40 },
        },
      }),
    );
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([expect.objectContaining({ targetId: "guild-2", x: 30 })]);
    view.unmount();
    expect(
      airTagReceiveController.getRenderableTargets(Date.now(), 10000),
    ).toEqual([]);
  });
});
