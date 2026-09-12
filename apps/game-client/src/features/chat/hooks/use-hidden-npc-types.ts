import { useSettingField } from "@/features/settings/persistence/use-setting-field";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";

/** NPC ranks that produce chat messages and can be filtered out. */
export const CHAT_NPC_TYPES = [
  NpcTypeEnum.ELITE2,
  NpcTypeEnum.HERO,
  NpcTypeEnum.COLOSSUS,
  NpcTypeEnum.TITAN,
] as const;

export type ChatNpcType = (typeof CHAT_NPC_TYPES)[number];

const CHAT_NPC_TYPE_SET: ReadonlySet<string> = new Set(CHAT_NPC_TYPES);

export const isChatNpcType = (value: unknown): value is ChatNpcType =>
  typeof value === "string" && CHAT_NPC_TYPE_SET.has(value);

/**
 * Owns reads and writes of the user's hidden chat NPC ranks. Writes from any
 * consumer (settings panel, context menu) merge in the shared patch queue.
 */
export const useHiddenNpcTypes = () => {
  const field = useSettingField("chat.hiddenNpcTypes");
  const hidden = new Set<NpcTypeEnum>(field.value);

  const setNpcTypeVisible = (npcType: NpcTypeEnum, isVisible: boolean) => {
    const next = CHAT_NPC_TYPES.filter((type) =>
      type === npcType ? !isVisible : hidden.has(type),
    );

    field.setValue([...next]);
  };

  return { hiddenNpcTypes: hidden, ready: field.ready, setNpcTypeVisible };
};
