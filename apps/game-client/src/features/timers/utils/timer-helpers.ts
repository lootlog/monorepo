import type { Timer } from "@/hooks/api/use-timers";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import type { Guild } from "@/hooks/api/use-guild";

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
  guilds?: Guild[],
): string => {
  return members
    .map((m) => {
      const guildName = guilds?.find((g) => g.id === m.guildId)?.name;
      return guildName ? `${m.name} (${guildName})` : m.name;
    })
    .join(", ");
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
