import type { MemberActivityStats } from "@/features/guild/settings/members/member-activity-stats-api";

export type MemberActivityStatsByDiscordId = Map<
  string,
  Partial<Record<MemberActivityStats["source"], MemberActivityStats>>
>;

export const mapMemberActivityStatsByDiscordIdAndSource = (
  stats: MemberActivityStats[] | undefined,
) => {
  const statsByDiscordId: MemberActivityStatsByDiscordId = new Map();

  for (const item of stats ?? []) {
    const memberStats = statsByDiscordId.get(item.discordId) ?? {};
    memberStats[item.source] = item;
    statsByDiscordId.set(item.discordId, memberStats);
  }

  return statsByDiscordId;
};

export const mapMemberActivityStatsByDiscordId = (
  stats: MemberActivityStats[] | undefined,
) => {
  const statsByDiscordId = new Map<string, MemberActivityStats>();

  for (const item of stats ?? []) {
    if (item.source === "WEB_APP") {
      statsByDiscordId.set(item.discordId, item);
    }
  }

  return statsByDiscordId;
};
