import { MemberIdentity } from "@/components/common/member-identity";
import { useTranslation } from "react-i18next";
import type { EventRanking } from "@/lib/api/event-types";
import { EventMemberKillsProfileLink } from "../shared/event-member-kills-profile-link";
import { getRankingMemberName } from "./get-ranking-member-name";

type RankingMemberNameProps = {
  ranking: EventRanking;
  /** With `eventId`, the profile card leads to the member's kills in the event. */
  guildId?: string;
  eventId?: string;
  /** False where the name sits inside the row's own link. */
  interactive?: boolean;
  className?: string;
  nameClassName?: string;
};

/** A ranked member's name, opening their profile. */
export const RankingMemberName = ({
  ranking,
  guildId,
  eventId,
  interactive,
  className,
  nameClassName,
}: RankingMemberNameProps) => {
  const { t } = useTranslation();

  return (
    <MemberIdentity
      member={{ memberId: ranking.memberId }}
      fallback={{ name: getRankingMemberName(ranking, t) }}
      display="name"
      interactive={interactive}
      profileLinks={
        guildId &&
        eventId && (
          <EventMemberKillsProfileLink
            guildId={guildId}
            eventId={eventId}
            memberId={ranking.memberId}
          />
        )
      }
      className={className}
      nameClassName={nameClassName}
    />
  );
};
