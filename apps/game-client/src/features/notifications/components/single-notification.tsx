import { FC, Fragment } from "react";
import { Notification } from "../hooks/use-notifications";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useNotificationsStore } from "@/store/notifications.store";
import { Separator } from "@radix-ui/react-select";
import { MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { useGuildMembers } from "@/hooks/api/use-guild-members";

export type SingleNotificationProps = {
  notification: Notification;
  index: number;
};

export const SingleNotification: FC<SingleNotificationProps> = ({
  notification,
  index,
}) => {
  const { removeNotification, notifications } = useNotificationsStore();
  const handleRemoveNotification = () => {
    removeNotification(notification.notificationId);
  };
  const { data: members } = useGuildMembers(notification.guildId);
  const guildMember = members?.[notification.discordId];
  const roleWithTopPosition = guildMember?.roles.sort(
    (a, b) => b.position - a.position
  );
  const roleColor = roleWithTopPosition?.[0]?.color;
  const color = roleColor === 0 ? "FFF" : roleColor?.toString(16);

  const imageHasDomain =
    notification.npc?.icon.startsWith("http://") ||
    notification.npc?.icon.startsWith("https://");

  return (
    <Fragment key={notification.notificationId}>
      <span
        className={cn(
          "ll-flex ll-flex-row ll-gap-8 ll-w-full ll-justify-start ll-py-2 ll-relative",
          {
            "ll-pt-0": index === 0,
          }
        )}
      >
        <XIcon
          className={cn(
            "ll-absolute ll-top-2 ll-right-1 ll-custom-cursor-pointer ll-text-gray-400 hover:ll-text-gray-300",
            {
              "-ll-top-1": index === 0,
              "ll-hidden": notifications.length === 1,
            }
          )}
          size="16"
          onClick={handleRemoveNotification}
        />
        {notification.npc && (
          <span className="ll-w-full ll-flex ll-items-center ll-justify-start ll-gap-8 ll-pl-4">
            <span className="ll-w-10 ll-flex ll-items-center ll-justify-center ll-pl-2">
              <img
                className={
                  "ll-relative ll-cursor-pointer ll-rounded-lg ll-max-h-16 ll-max-w-12"
                }
                draggable={false}
                src={`${imageHasDomain ? "" : MARGONEM_CDN_NPCS_URL}${notification.npc.icon}`}
                alt={notification.npc.name}
              />
            </span>
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
      </span>
      <span className="ll-flex ll-flex-col ll-justify-center"></span>
      {notifications.length > 1 && (
        <Separator className="ll-bg-gray-600 ll-h-[1px]" />
      )}
    </Fragment>
  );
};
