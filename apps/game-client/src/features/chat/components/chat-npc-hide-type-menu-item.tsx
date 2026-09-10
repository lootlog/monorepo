import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  isChatNpcType,
  useHiddenNpcTypes,
} from "@/features/chat/hooks/use-hidden-npc-types";
import { resolveNpcType } from "@lootlog/domain/npc-routing";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import { EyeOff } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type ChatNpcHideTypeMenuItemProps = {
  npc: NonNullable<ChatMessageType["npc"]>;
};

/**
 * Context menu entry that hides every chat message of the clicked NPC's rank.
 * Mounted only while the menu is open so message rows stay cheap to render.
 */
export const ChatNpcHideTypeMenuItem: FC<ChatNpcHideTypeMenuItemProps> = ({
  npc,
}) => {
  const { t } = useTranslation(["chat", "common"]);
  const { hiddenNpcTypes, ready, setNpcTypeVisible } = useHiddenNpcTypes();
  const npcType = resolveNpcType(npc);
  if (!isChatNpcType(npcType) || hiddenNpcTypes.has(npcType)) return null;

  return (
    <ContextMenuItem
      disabled={!ready}
      onClick={() => setNpcTypeVisible(npcType, false)}
    >
      <EyeOff
        aria-hidden="true"
        strokeWidth={1.5}
        className="ll:mr-2 ll:size-3.5 ll:shrink-0"
      />
      {t("contextMenu.hideNpcType", {
        npcType: t(`common:npcTypes.${npcType.toLowerCase()}`),
      })}
    </ContextMenuItem>
  );
};
