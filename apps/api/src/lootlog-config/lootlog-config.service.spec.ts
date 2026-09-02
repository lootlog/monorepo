import { describe, expect, it, vi } from "vitest";
import type { DrizzleDatabaseRuntime } from "../database/drizzle/runtime.js";
import { LootlogConfigService } from "./lootlog-config.service.js";

describe("LootlogConfigService", () => {
  it("does not touch the database for an empty multi-config lookup", async () => {
    const databaseRuntime = {
      runPromise: vi.fn<DrizzleDatabaseRuntime["runPromise"]>(),
    };
    const service = new LootlogConfigService(
      databaseRuntime as unknown as DrizzleDatabaseRuntime,
    );

    await expect(service.getMultipleLootlogConfigs([])).resolves.toEqual([]);
    expect(databaseRuntime.runPromise).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric NPC configuration id before querying", async () => {
    const databaseRuntime = {
      runPromise: vi.fn<DrizzleDatabaseRuntime["runPromise"]>(),
    };
    const service = new LootlogConfigService(
      databaseRuntime as unknown as DrizzleDatabaseRuntime,
    );

    await expect(
      service.updateNpc("guild-1", "not-a-number", {
        allowedRarities: [],
      }),
    ).rejects.toThrow("NPC configuration not found");
    expect(databaseRuntime.runPromise).not.toHaveBeenCalled();
  });
});
