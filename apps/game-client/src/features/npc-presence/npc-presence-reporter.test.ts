import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NpcPresenceReport } from "@lootlog/schema/npc-presence";
import type { RuntimeNpc } from "@/lib/margonem-runtime/runtime.types";
import { useNpcsStore } from "@/store/npcs.store";
import {
  NPC_PRESENCE_REPORT_DELAY_MS,
  NpcPresenceReporter,
} from "./npc-presence-reporter";

const runtimeNpc = (id: number, weight: number): RuntimeNpc => ({
  id,
  icon: "npc.gif",
  level: 120,
  name: `Npc ${id}`,
  profession: "w",
  templateId: null,
  type: 2,
  weight,
  x: 1,
  y: 1,
});

describe("NPC presence reporter", () => {
  let reporter: NpcPresenceReporter;
  let reports: NpcPresenceReport[];

  const send = vi.fn(async (report: NpcPresenceReport) => {
    reports.push(report);

    return { status: "accepted" as const };
  });

  const configure = (ready: boolean) =>
    reporter.configure({
      ready,
      world: "alpha",
      characterId: "hero",
      organizationIds: ["guild-1"],
      send,
    });

  const settle = async () => {
    await vi.advanceTimersByTimeAsync(NPC_PRESENCE_REPORT_DELAY_MS);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    reports = [];
    send.mockClear();
    useNpcsStore.getState().clearNpcs(true);
    reporter = new NpcPresenceReporter();
  });

  afterEach(() => {
    reporter.shutdown();
    vi.useRealTimers();
  });

  it("reports the timer NPCs of the map only when they change, and again on a new connection", async () => {
    useNpcsStore
      .getState()
      .replaceNpcs([runtimeNpc(1, 25), runtimeNpc(2, 5)], true);
    configure(true);
    await settle();
    expect(reports.map((report) => report.npcs.map(({ id }) => id))).toEqual([
      [1],
    ]);

    // A moved NPC or a light one appearing changes nothing the gateway stores.
    useNpcsStore.getState().applyNpcBatch({
      upserts: [{ ...runtimeNpc(1, 25), x: 9 }, runtimeNpc(3, 10)],
    });
    await settle();
    expect(send).toHaveBeenCalledTimes(1);

    // Killed: the next report withdraws it.
    useNpcsStore.getState().applyNpcBatch({ removeIds: [1] });
    await settle();
    expect(reports.at(-1)?.npcs).toEqual([]);

    // A reconnected socket starts without reports, so the current map goes out again.
    useNpcsStore.getState().applyNpcBatch({ upserts: [runtimeNpc(4, 30)] });
    configure(false);
    await settle();
    configure(true);
    await settle();
    expect(reports.at(-1)?.npcs.map(({ id }) => id)).toEqual([4]);
    expect(send).toHaveBeenCalledTimes(3);
  });
});
