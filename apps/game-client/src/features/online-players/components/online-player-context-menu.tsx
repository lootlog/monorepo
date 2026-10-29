import { ContextMenuItem } from "@/components/ui/context-menu";
import { Shirt, UserPlus, UserRound } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type OnlinePlayerContextMenuProps = {
  canAddFriend: boolean;
  canShowGameContextActions: boolean;
  onAddFriend: () => void;
  onShowEquipment: () => void;
  onShowProfile: () => void;
};

/** The items of an online player's menu in the list's shared context menu. */
export const OnlinePlayerContextMenu: FC<OnlinePlayerContextMenuProps> = ({
  canAddFriend,
  canShowGameContextActions,
  onAddFriend,
  onShowEquipment,
  onShowProfile,
}) => {
  const { t } = useTranslation("onlinePlayers");

  return (
    <>
      {canShowGameContextActions ? (
        <>
          <ContextMenuItem onClick={onShowProfile}>
            <UserRound
              aria-hidden="true"
              strokeWidth={1.5}
              className="ll:mr-2 ll:size-3.5 ll:shrink-0"
            />
            {t("contextMenu.showProfile")}
          </ContextMenuItem>
          <ContextMenuItem onClick={onShowEquipment}>
            <Shirt
              aria-hidden="true"
              strokeWidth={1.5}
              className="ll:mr-2 ll:size-3.5 ll:shrink-0"
            />
            {t("contextMenu.showEquipment")}
          </ContextMenuItem>
        </>
      ) : null}
      {canAddFriend ? (
        <ContextMenuItem onClick={onAddFriend}>
          <UserPlus
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("contextMenu.addFriend")}
        </ContextMenuItem>
      ) : null}
    </>
  );
};
