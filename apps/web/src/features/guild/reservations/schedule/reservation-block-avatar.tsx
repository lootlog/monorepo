import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "cn";
import { MemberIdentity } from "@/components/common/member-identity";
import type { ReservationSegment } from "./types";

type ReservationBlockAvatarProps = {
  reservation: ReservationSegment["reservation"];
  compact: boolean;
};

export const ReservationBlockAvatar = ({
  reservation,
  compact,
}: ReservationBlockAvatarProps) => {
  const size = compact ? "size-4" : "size-6";
  const visibility = compact && "hidden @min-[7rem]:flex";

  if (!reservation.sourceOrganization.isCurrent) {
    return (
      <Avatar className={cn("shrink-0 rounded-[4px]", size, visibility)}>
        <AvatarImage
          src={reservation.sourceOrganization.iconUrl ?? undefined}
          alt=""
        />
        <AvatarFallback className="rounded-[4px] text-2xs">
          {reservation.sourceOrganization.name.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <MemberIdentity
      member={
        reservation.author.userId
          ? { userId: reservation.author.userId }
          : undefined
      }
      fallback={{
        name: reservation.author.displayName,
        avatarUrl: reservation.author.avatarUrl,
      }}
      display="avatar"
      interactive={false}
      className={cn("shrink-0", visibility)}
      avatarClassName={size}
    />
  );
};
