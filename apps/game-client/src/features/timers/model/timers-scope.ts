import { GLOBAL_TIMER_SETTINGS_KEY } from "@/store/timer-settings-sync";

export type TimersScopeInput = {
  characterId: string;
  guildIdByCharId: Record<string, string>;
  worldByGuildId: Record<string, string>;
  allowWorldSelection: boolean;
  gameWorld: string;
  isGrouping: boolean;
};

export type TimersScope = {
  /** Organization the current character is assigned to; undefined until chosen. */
  guildId: string | undefined;
  /** Key of the hidden/pinned/filter lists: the organization, or `global` when grouping. */
  settingsKey: string;
  /** World whose timers are listed: the selected one when allowed, else the game world. */
  world: string;
  isGrouping: boolean;
  allowWorldSelection: boolean;
};

export const resolveTimersScope = ({
  characterId,
  guildIdByCharId,
  worldByGuildId,
  allowWorldSelection,
  gameWorld,
  isGrouping,
}: TimersScopeInput): TimersScope => {
  const guildId = guildIdByCharId[characterId];
  const selectedWorld = guildId ? worldByGuildId[guildId] : undefined;

  return {
    guildId,
    settingsKey: isGrouping ? GLOBAL_TIMER_SETTINGS_KEY : (guildId ?? ""),
    world: selectedWorld && allowWorldSelection ? selectedWorld : gameWorld,
    isGrouping,
    allowWorldSelection,
  };
};
