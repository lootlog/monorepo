import { FC, Fragment } from "react";
import { Notification } from "../hooks/use-notifications";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import {
  PickedNpcType,
  useNotificationsStore,
} from "@/store/notifications.store";
import { Separator } from "@radix-ui/react-select";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { NpcType } from "@/hooks/api/use-npcs";
import { useGlobalStore } from "@/store/global.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { NpcTile } from "@/components/npc-tile";

export type SingleNotificationProps = {
  notification: Notification;
  index: number;
};

const BASE_SHADOW_COLOR_BY_NPC_TYPE: Record<PickedNpcType, string> = {
  [NpcType.COLOSSUS]: "0 0px 64px 32px rgba(53, 255, 105, 0.7)", // green
  [NpcType.HERO]: "0 0px 64px 32px rgba(220, 247, 99, 0.7)", // yellow
  [NpcType.ELITE2]: "0 0px 64px 32px rgba(219, 90, 186, 0.7)", // rose
  [NpcType.TITAN]: "0 0px 64px 32px rgba(59, 130, 246, 0.7)", // blue
};

export const SingleNotification: FC<SingleNotificationProps> = ({
  notification,
  index,
}) => {
  const { removeNotification, notifications, settings } =
    useNotificationsStore();
  const handleRemoveNotification = () => {
    removeNotification(notification.notificationId);
  };
  const { characterId } = useGlobalStore((s) => s.gameState);
  const { data: members } = useGuildMembers(notification.guildId);
  const guildMember = members?.[notification.discordId];
  const roleWithTopPosition = guildMember?.roles.sort(
    (a, b) => b.position - a.position
  );
  const roleColor = roleWithTopPosition?.[0]?.color;
  const color = roleColor === 0 ? "FFF" : roleColor?.toString(16);

  const npcType = getNpcTypeByWt(notification.npc?.wt!);

  const settingsByNpcType = settings[characterId!][npcType as PickedNpcType];

  const boxShadow = settingsByNpcType.highlight
    ? BASE_SHADOW_COLOR_BY_NPC_TYPE[npcType as PickedNpcType]
    : "";

  return (
    <Fragment key={notification.notificationId}>
      <span className={cn("ll-flex ll-py-2 ll-gap-4 ll-rounded-lg ll-px-3")}>
        {notification.npc && (
          <span className="ll-w-full ll-flex ll-gap-2">
            <NpcTile npc={notification.npc} />
            <span className="ll-flex ll-flex-col ll-justify-center">
              <span>
                <span className="ll-font-semibold">
                  {notification.npc.name}{" "}
                </span>
                <span>
                  ({notification.npc.lvl}
                  {notification.npc.prof})
                </span>
              </span>
              <span className="ll-mb-2 ll-text-xs">
                {notification.npc.location} ({notification.npc.x},{" "}
                {notification.npc.y})
              </span>
              <span className="ll-text-xs">
                <span>Świat:</span>{" "}
                <span className="ll-font-semibold">{notification.world}</span>
              </span>
              <span className="ll-mb-2 ll-text-xs">
                <span>Dodane przez: </span>
                <span
                  className="ll-font-semibold"
                  style={{ color: `#${color}` }}
                >
                  {members?.[notification.discordId].name}
                </span>
              </span>
            </span>
          </span>
        )}
        {notifications.length > 1 && (
          <XIcon
            className={cn(
              "ll-custom-cursor-pointer ll-text-gray-300 hover:ll-text-gray-100 ll-transition-colors"
            )}
            size="16"
            onClick={handleRemoveNotification}
          />
        )}
      </span>
      <span className="ll-flex ll-flex-col ll-justify-center"></span>
      <Separator
        className={cn("ll-bg-gray-600 ll-h-[1px]", {
          "ll-h-0": notifications.length === 1,
        })}
        style={{
          boxShadow,
        }}
      />
    </Fragment>
  );
};
