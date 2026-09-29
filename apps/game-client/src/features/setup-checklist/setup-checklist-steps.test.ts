import { describe, expect, it } from "vitest";
import { getSetupChecklist } from "./setup-checklist-steps";

const statuses = (checklist: ReturnType<typeof getSetupChecklist>) =>
  Object.fromEntries(checklist.steps.map((step) => [step.id, step.status]));

describe("getSetupChecklist", () => {
  it("asks a signed-out player only to sign in and holds the later steps", () => {
    const checklist = getSetupChecklist({
      signedIn: false,
      guildIds: undefined,
      catchingGuildIds: undefined,
      realtimeStatus: "unreachable",
    });

    expect(statuses(checklist)).toEqual({
      "sign-in": "todo",
      "join-lootlog": "blocked",
      catching: "blocked",
      realtime: "blocked",
    });
    expect(checklist.incomplete).toBe(true);
  });

  it("asks a signed-in player without any Lootlog to join one before choosing a catching scope or connecting", () => {
    const checklist = getSetupChecklist({
      signedIn: true,
      guildIds: [],
      catchingGuildIds: [],
      realtimeStatus: "unreachable",
    });

    expect(statuses(checklist)).toMatchObject({
      "join-lootlog": "todo",
      catching: "blocked",
      realtime: "blocked",
    });
    expect(checklist.incomplete).toBe(true);
  });

  it("treats a catching scope made only of Lootlogs the player left as missing", () => {
    const checklist = getSetupChecklist({
      signedIn: true,
      guildIds: ["guild-1"],
      catchingGuildIds: ["guild-left"],
      realtimeStatus: "online",
    });

    expect(statuses(checklist).catching).toBe("todo");
    expect(checklist.incomplete).toBe(true);
  });

  it("does not report missing setup while the session, Lootlogs or config are still loading", () => {
    expect(
      getSetupChecklist({
        signedIn: undefined,
        guildIds: undefined,
        catchingGuildIds: undefined,
        realtimeStatus: "connecting",
      }).incomplete,
    ).toBe(false);
    expect(
      getSetupChecklist({
        signedIn: true,
        guildIds: undefined,
        catchingGuildIds: undefined,
        realtimeStatus: "connecting",
      }).incomplete,
    ).toBe(false);
    expect(
      getSetupChecklist({
        signedIn: true,
        guildIds: ["guild-1"],
        catchingGuildIds: undefined,
        realtimeStatus: "online",
      }).incomplete,
    ).toBe(false);
  });

  it("keeps a finished setup complete while the realtime connection drops", () => {
    const checklist = getSetupChecklist({
      signedIn: true,
      guildIds: ["guild-1", "guild-2"],
      catchingGuildIds: ["guild-2"],
      realtimeStatus: "reconnecting",
    });

    expect(statuses(checklist).realtime).toBe("todo");
    expect(checklist.remaining).toBe(1);
    expect(checklist.incomplete).toBe(false);
  });

  it("has nothing left once every step is done", () => {
    const checklist = getSetupChecklist({
      signedIn: true,
      guildIds: ["guild-1"],
      catchingGuildIds: ["guild-1"],
      realtimeStatus: "online",
    });

    expect(checklist.remaining).toBe(0);
    expect(checklist.incomplete).toBe(false);
  });
});
