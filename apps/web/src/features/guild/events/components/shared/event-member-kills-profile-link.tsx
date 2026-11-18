import { MemberProfileLink } from "@/components/common/member-profile-link";
import { Link } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";

type EventMemberKillsProfileLinkProps = {
  guildId: string;
  eventId: string;
  memberId: number;
};

/** The profile card's way to a member's kills in the event. */
export const EventMemberKillsProfileLink = ({
  guildId,
  eventId,
  memberId,
}: EventMemberKillsProfileLinkProps) => {
  const { t } = useTranslation();

  return (
    <MemberProfileLink
      primary
      icon={Swords}
      link={
        <Link
          to="/$guildId/events/$eventId/members/$memberId"
          params={{ guildId, eventId, memberId: String(memberId) }}
        />
      }
    >
      {t("common.memberProfile.eventKills")}
    </MemberProfileLink>
  );
};
