import { Button } from "@/components/ui/button";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import { useVolunteer } from "@/hooks/api/use-volunteer";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { getDiscordAvatarUrl } from "@/utils/discord/get-avatar-url";
import type { FC } from "react";
import {
  useNotificationsStore,
  type PartyGatheringNotification,
} from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { CharacterTile } from "@/components/character-tile";
import { Game } from "@/lib/game";

type SingleNotificationPartyGatheringProps = {
  notification: PartyGatheringNotification;
  serverNames?: string[];
  member?: GuildMember;
  time?: string;
};

export const SingleNotificationPartyGathering: FC<
  SingleNotificationPartyGatheringProps
> = ({ notification, serverNames = [], member, time }) => {
  const avatarUrl = getDiscordAvatarUrl(member?.userId, member?.avatar);
  const color = useMemberColor(member);
  const volunteer = useVolunteer();
  const { clearNotifications } = useNotificationsStore();
  const setOpen = useWindowsStore((state) => state.setOpen);

  const heroLvl = Game.hero.lvl;
  const minLvl = notification.minLvl ?? 1;
  const maxLvl = notification.maxLvl ?? 500;
  const meetsLevelReq = heroLvl >= minLvl && heroLvl <= maxLvl;

  const handleClick = () => {
    volunteer.mutate({
      notificationId: notification.notificationId,
      targetDiscordId: notification.discordId,
      world: notification.world,
    });
    setOpen("notifications", false);
    clearNotifications();
  };

  return (
    <div className="ll:flex ll:w-full ll:flex-col ll:gap-1">
      <div className="ll:flex ll:items-center ll:gap-2">
        <img
          src={avatarUrl}
          alt="Avatar"
          className="ll:h-7 ll:w-7 ll:rounded-full"
        />
        <span className="ll:font-semibold" style={{ color: `#${color}` }}>
          {member?.name}
        </span>
        <span className="ll:text-[11px] ll:text-gray-300">
          {time}@{serverNames.join(", ")} - {notification.world}
        </span>
      </div>

      <div className="ll:flex ll:gap-4 ll:py-1 ll:px-2">
        <div className="ll:flex ll:items-center ll:gap-2">
          <CharacterTile
            character={{
              ...notification.character,
              id: Number(notification.character.characterId),
            }}
            className="ll:scale-75"
          />
          <div className="ll:flex ll:flex-col">
            <span className="ll:flex ll:items-center ll:gap-1">
              <span className="ll:text-[12px] ll:font-semibold">
                {notification.character.nick}
              </span>
              <span className="ll:text-[11px]">
                ({notification.character.lvl}
                {notification.character.prof})
              </span>
            </span>
            {notification.description && (
              <span className="ll:text-[11px] ll:text-gray-300 ll:italic">
                "{notification.description}"
              </span>
            )}
            {(notification.minLvl !== null || notification.maxLvl !== null) && (
              <span className="ll:text-[10px] ll:text-gray-400">
                Poziom: {notification.minLvl ?? 1} -{" "}
                {notification.maxLvl ?? 500}
              </span>
            )}
            <span className="ll:text-[10px] ll:font-semibold ll:text-purple-400">
              Szuka grupy
            </span>
          </div>
        </div>
        <div className="ll:flex ll:flex-col ll:items-center ll:justify-center ll:ml-auto ll:mr-4 ll:gap-1">
          <Button
            onClick={handleClick}
            disabled={volunteer.isPending || !meetsLevelReq}
          >
            {volunteer.isPending ? "..." : "Dołącz!"}
          </Button>
          {!meetsLevelReq && (
            <span className="ll:text-[9px] ll:text-red-400 ll:text-center">
              Wymagany poziom {minLvl}-{maxLvl}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
