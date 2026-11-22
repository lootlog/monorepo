import { MemberIdentity } from "@/components/common/member-identity";
import { useTranslation } from "react-i18next";
import type { EventRanking } from "@/lib/api/event-types";
import { EventMemberKillsProfileLink } from "../shared/event-member-kills-profile-link";
import { getRankingMemberName } from "./get-ranking-member-name";

type RankingMemberNameProps = {
  ranking: EventRanking;
  guildId?: string;
  eventId?: string;
  interactive?: boolean;
  className?: string;
  nameClassName?: string;
};

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
