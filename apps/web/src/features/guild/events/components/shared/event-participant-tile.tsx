import { MemberIdentity } from "@/components/common/member-identity";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { Member } from "@/lib/api/event-types";
import { EventMemberKillsProfileLink } from "./event-member-kills-profile-link";

interface EventParticipantTileProps {
  eventId: string;
  guildId: string;
  member: Member;
}

/** A participant's tile: the tile opens their kills in the event, the person their profile. */
export const EventParticipantTile = ({
  eventId,
  guildId,
  member,
}: EventParticipantTileProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative min-w-0 border-b border-r border-sidebar-border transition-colors hover:bg-muted/30">
      <Link
        to="/$guildId/events/$eventId/members/$memberId"
        params={{
          guildId,
          eventId,
          memberId: String(member.id),
        }}
        aria-label={t("events.ranking.openMemberStats", {
          memberName: member.name,
        })}
        className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />
      <div className="pointer-events-none relative flex min-w-0 items-center px-3 py-2.5">
        <span className="pointer-events-auto inline-flex max-w-full min-w-0">
          <MemberIdentity
            member={{ memberId: member.id }}
            fallback={{
              name: member.name,
              avatarUrl: getDiscordAvatarUrl(member.userId, member.avatar, 64),
            }}
            profileLinks={
              <EventMemberKillsProfileLink
                guildId={guildId}
                eventId={eventId}
                memberId={member.id}
              />
            }
            className="gap-2"
            avatarClassName="size-7"
            nameClassName="text-sm font-semibold"
          />
        </span>
      </div>
    </div>
  );
};
