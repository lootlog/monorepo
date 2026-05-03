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
  const memberMap = new Map<
    GuildMember["id"],
    {
      id: GuildMember["id"];
      memberLabel: string;
      characterLabel?: string;
    }
  >();

  for (const member of members) {
    if (!memberMap.has(member.id)) {
      const guildName = guildNamesById[member.guildId];
      const actorCharacter = actorCharactersByMemberId[String(member.id)];
      const characterLabel = actorCharacter
        ? `${actorCharacter.name} (${actorCharacter.lvl ?? ""}${actorCharacter.prof?.charAt(0).toLowerCase() ?? ""})`
        : undefined;
      const memberLabel = guildName
        ? `${member.name} (${guildName})`
        : member.name;

      memberMap.set(member.id, {
        id: member.id,
        memberLabel,
        characterLabel,
      });
    }
  }

  return Array.from(memberMap.values());
};

export const calculateTimeLeft = (
  minTimeLeft: number,
  maxTimeLeft: number,
  countdownMode: "min" | "max",
  isMinSpawnTime: boolean,
) => {
  if (countdownMode === "max" || isMinSpawnTime) {
    return maxTimeLeft;
  }
  return minTimeLeft;
};

export const getTimerColorConfig = (
  npcName: string,
  timersColors: Record<string, string>,
  customColors: Record<
    string,
    { id: string; name: string; backgroundColor: string; borderColor: string }
  >,
  overriddenDefaultColors: Record<
    string,
    { backgroundColor: string; borderColor: string }
  >,
) => {
  const selectedColor = timersColors[npcName] ?? "white";
  const customColor = customColors[selectedColor];
  const overriddenColor = overriddenDefaultColors[selectedColor];

  return { selectedColor, customColor, overriddenColor };
};
