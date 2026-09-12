import type { Timer } from "@/api/timers.api";
import type { GuildMember } from "@/types/guild-member";
import { formatCharacterLabel } from "./timer-labels";

export const getTimerMembers = (timer: Timer): GuildMember[] => {
  if (timer.members && timer.members.length > 0) return timer.members;

  if (timer.member) return [timer.member];

  return [];
};

export type TimerMemberLabel = {
  id: GuildMember["id"];
  memberLabel: string;
  characterLabel?: string;
};

/** One label per member (first occurrence wins), with the guild name and the acting character. */
export const getMembersWithGuilds = (
  members: GuildMember[],
  guildNamesById: Record<string, string>,
  actorCharactersByMemberId: Timer["actorCharactersByMemberId"] = {},
): TimerMemberLabel[] => {
  const memberMap = new Map<GuildMember["id"], TimerMemberLabel>();

  for (const member of members) {
    if (memberMap.has(member.id)) continue;
    const guildName = guildNamesById[member.guildId];
    const actorCharacter = actorCharactersByMemberId[String(member.id)];

    memberMap.set(member.id, {
      id: member.id,
      memberLabel: guildName ? `${member.name} (${guildName})` : member.name,
      characterLabel: actorCharacter
        ? formatCharacterLabel(actorCharacter)
        : undefined,
    });
  }

  return Array.from(memberMap.values());
};
