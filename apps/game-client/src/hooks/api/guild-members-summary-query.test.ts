import { describe, expect, it } from "vitest";
import {
  GUILD_MEMBERS_SUMMARY_GC_TIME,
  getGuildMembersSummaryQueryOptions,
} from "./guild-members-summary-query";

describe("guild members summary query", () => {
  it("releases an inactive guild cache after the shared retention window", () => {
    const options = getGuildMembersSummaryQueryOptions({ guildId: "guild-1" });

    expect(options.gcTime).toBe(GUILD_MEMBERS_SUMMARY_GC_TIME);
    expect(options.gcTime).toBe(30 * 60 * 1000);
  });
});
