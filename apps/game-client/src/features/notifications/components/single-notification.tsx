import { FC, Fragment } from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import {
  NotificationWithServers,
  PickedNpcType,
  useNotificationsStore,
} from "@/store/notifications.store";
import { Separator } from "@radix-ui/react-select";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { NpcType } from "@/hooks/api/use-npcs";
import { useGlobalStore } from "@/store/global.store";
import { getNpcTypeByWt } from "@/utils/game/npcs/get-npc-type-by-wt";
import { NpcTile } from "@/components/npc-tile";
import { useGuilds } from "@/hooks/api/use-guilds";

export type SingleNotificationProps = {
  notification: NotificationWithServers;
  index: number;
};

const COLORS_BY_NPC_TYPE: Record<PickedNpcType, string> = {
  [NpcType.COLOSSUS]: "rgba(53, 255, 105, 0.6)",
  [NpcType.HERO]: "rgba(249, 137, 72, 0.6)",
  [NpcType.ELITE2]: "rgba(219, 90, 186, 0.6)",
  [NpcType.TITAN]: "rgba(59, 130, 246, 0.6)",
};

const BASE_BACKGROUND_GRADIENT_BY_NPC_TYPE: Record<PickedNpcType, string> = {
  [NpcType.COLOSSUS]: `linear-gradient(to top, ${COLORS_BY_NPC_TYPE[NpcType.COLOSSUS]}, transparent)`,
  [NpcType.HERO]: `linear-gradient(to top, ${COLORS_BY_NPC_TYPE[NpcType.HERO]}, transparent)`,
  [NpcType.ELITE2]: `linear-gradient(to top, ${COLORS_BY_NPC_TYPE[NpcType.ELITE2]}, transparent)`,
  [NpcType.TITAN]: `linear-gradient(to top, ${COLORS_BY_NPC_TYPE[NpcType.TITAN]}, transparent)`,
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
  const { data: guilds } = useGuilds();
  const guildMember = members?.[notification.discordId];
  const roleWithTopPosition = guildMember?.roles.sort(
    (a, b) => b.position - a.position
  );
  const roleColor = roleWithTopPosition?.[0]?.color;
  const color = roleColor === 0 ? "FFF" : roleColor?.toString(16);

  const npcType = getNpcTypeByWt(notification.npc?.wt!);

  const settingsByNpcType = settings[characterId!][npcType as PickedNpcType];

  const gradient = settingsByNpcType.highlight
    ? BASE_BACKGROUND_GRADIENT_BY_NPC_TYPE[npcType as PickedNpcType]
    : "";
  const backgroundColor = settingsByNpcType.highlight
    ? COLORS_BY_NPC_TYPE[npcType as PickedNpcType]
    : "transparent";

  const serverNames = notification.servers.map((server) => {
    const guild = guilds?.find((g) => g.id === server);
    return guild ? guild.name : "";
  });

  return (
    <Fragment key={notification.notificationId}>
      <span
        className={cn("ll-flex ll-py-2 ll-gap-4 ll-px-3")}
        style={{
          background: index === 0 ? gradient : backgroundColor,
        }}
      >
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
              <span className="ll-text-xs">
                <span>Dodane przez: </span>
                <span
                  className="ll-font-semibold"
                  style={{ color: `#${color}` }}
                >
                  {members?.[notification.discordId].name}
                </span>
              </span>
              <span className="ll-text-xs">
                <span>Serwery: </span>
                <span className="ll-font-semibold">
                  {serverNames.join(", ")}
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
      />
    </Fragment>
  );
};
