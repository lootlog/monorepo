import {
  LOOTLOG_GUILD_STATUS_COLORS,
  TIP_SECTION_START,
} from "@/addons/extensions/online-players-glow/online-players-glow.constants";
import {
  resolveLootlogGuildActivityStatus,
  resolveLootlogGuildStatusColor,
  stripTipSectionFromHtml,
  syncLootlogSectionInTipHtml,
} from "@/addons/extensions/online-players-glow/online-players-glow-tip.utils";
import { describe, expect, it } from "vitest";

describe("online-players-glow-tip.utils", () => {
  it("resolves guild activity status and colors", () => {
    expect(resolveLootlogGuildActivityStatus(undefined, "g1")).toBe("none");
    expect(
      resolveLootlogGuildActivityStatus(
        {
          g1: { timersEnabled: true, lootEnabled: true },
        },
        "g1",
      ),
    ).toBe("both");
    expect(
      resolveLootlogGuildActivityStatus(
        {
          g2: { timersEnabled: true, lootEnabled: false },
        },
        "g2",
      ),
    ).toBe("partial");

    expect(resolveLootlogGuildStatusColor("both")).toBe(
      LOOTLOG_GUILD_STATUS_COLORS.both,
    );
    expect(resolveLootlogGuildStatusColor("partial")).toBe(
      LOOTLOG_GUILD_STATUS_COLORS.partial,
    );
    expect(resolveLootlogGuildStatusColor("none")).toBe(
      LOOTLOG_GUILD_STATUS_COLORS.none,
    );
  });

  it("inserts and removes lootlog tip section", () => {
    const baseTip = "<div>Base tip</div>";

    const tipWithSection = syncLootlogSectionInTipHtml(baseTip, [
      {
        guildId: "guild-1",
        label: "Guild One",
        status: "both",
        color: LOOTLOG_GUILD_STATUS_COLORS.both,
      },
      {
        guildId: "guild-2",
        label: "Guild Two",
        status: "partial",
        color: LOOTLOG_GUILD_STATUS_COLORS.partial,
      },
    ]);

    expect(tipWithSection).toContain(TIP_SECTION_START);
    expect(tipWithSection).toContain("Guild One");
    expect(tipWithSection).toContain("Guild Two");
    expect(tipWithSection).toContain(LOOTLOG_GUILD_STATUS_COLORS.both);
    expect(tipWithSection).toContain(LOOTLOG_GUILD_STATUS_COLORS.partial);

    const stripped = stripTipSectionFromHtml(tipWithSection);
    expect(stripped).toBe(baseTip);
  });
});
