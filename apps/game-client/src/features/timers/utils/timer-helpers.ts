import { uniqBy } from "es-toolkit";
import type { Timer } from "@/api/timers.api";
import type { GuildMember } from "@/types/guild-member";

export const getLevelSuffix = (npc: Timer["npc"]) => {
  if (npc.lvl === 0) return "";

  return ` (${npc.lvl}${npc.prof?.charAt(0).toLowerCase() ?? ""})`;
};

export const getTimerMembers = (timer: Timer): GuildMember[] => {
  if (timer.members && timer.members.length > 0) return timer.members;

  if (timer.member) return [timer.member];

  return [];
};

export const getMembersWithGuilds = (
  members: GuildMember[],
  guildNamesById: Record<string, string>,
  actorCharactersByMemberId: Timer["actorCharactersByMemberId"] = {},
): {
  id: GuildMember["id"];
  memberLabel: string;
  characterLabel?: string;
}[] => {
  return uniqBy(members, (member) => member.id).map((member) => {
    const guildName = guildNamesById[member.guildId];
    const actorCharacter = actorCharactersByMemberId[String(member.id)];

    const characterLabel = actorCharacter
      ? `${actorCharacter.name} (${actorCharacter.lvl ?? ""}${actorCharacter.prof?.charAt(0).toLowerCase() ?? ""})`
      : undefined;

    const memberLabel = guildName
      ? `${member.name} (${guildName})`
      : member.name;

    return { id: member.id, memberLabel, characterLabel };
  });
};
