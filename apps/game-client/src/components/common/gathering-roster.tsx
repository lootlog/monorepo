import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PartyGatheringSummary } from "@lootlog/schema/party-ready-room";
import { PlayerName } from "@/components/player-name";
import { useGatheringPartyState } from "@/components/common/use-gathering-party-state";

type GatheringRosterProps = Pick<
  PartyGatheringSummary,
  "volunteers" | "partyState"
> & {
  stale?: boolean;
  volunteerContent?: ReactNode;
};

export function GatheringRoster({
  volunteers,
  partyState,
  stale,
  volunteerContent,
}: GatheringRosterProps) {
  const { t } = useTranslation("partyFinder");
  const { observation, isStale } = useGatheringPartyState(partyState, stale);

  const partyIds = new Set(
    observation?.members.map((member) => member.characterId),
  );

  return (
    <div className="ll:relative ll:z-2 ll:flex ll:min-w-0 ll:flex-col ll:gap-1.5 ll:py-1 ll:text-[11px] ll:leading-4">
      <section
        aria-label={t("roster.volunteers", { count: volunteers?.length ?? 0 })}
      >
        <p className="ll:m-0 ll:px-[6px] ll:font-semibold ll:text-white/80">
          {volunteers
            ? t("roster.volunteers", { count: volunteers.length })
            : t("roster.volunteersUnknown")}
        </p>
        {volunteerContent ?? (
          <>
            {volunteers && volunteers.length > 0 && (
              <ul className="ll:m-0 ll:flex ll:min-w-0 ll:list-none ll:flex-col ll:p-0">
                {volunteers.map((volunteer) => (
                  <li
                    key={volunteer.characterId}
                    className="ll:flex ll:min-w-0 ll:items-center ll:justify-between ll:gap-1 ll:px-[6px]"
                  >
                    <PlayerName
                      name={volunteer.nick}
                      level={volunteer.lvl}
                      profession={volunteer.prof}
                    />
                    {observation && !isStale && (
                      <span className="ll:shrink-0 ll:text-[10px] ll:text-white/60">
                        {t(
                          partyIds.has(volunteer.characterId)
                            ? "roster.inParty"
                            : "roster.outsideParty",
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {volunteers?.length === 0 && (
              <p className="ll:m-0 ll:px-[6px] ll:text-white/60">
                {t("roster.volunteersEmpty")}
              </p>
            )}
          </>
        )}
      </section>
      <section aria-label={t("roster.partyLabel")}>
        <p className="ll:m-0 ll:px-[6px] ll:font-semibold ll:text-white/80">
          {observation
            ? t("roster.party", { count: observation.members.length })
            : t("roster.partyUnknown")}
        </p>
        {observation && (
          <>
            <p className="ll:m-0 ll:px-[6px] ll:text-[10px] ll:text-white/60">
              <time dateTime={observation.observedAt}>
                {t("roster.observedAt", {
                  time: new Date(observation.observedAt).toLocaleTimeString(
                    "pl-PL",
                    { hour: "2-digit", minute: "2-digit" },
                  ),
                })}
              </time>
            </p>
            {isStale && (
              <p role="status" className="ll:m-0 ll:px-[6px] ll:text-amber-200">
                {t("roster.partyStale")}
              </p>
            )}
            {observation.members.length > 0 ? (
              <ul className="ll:m-0 ll:flex ll:min-w-0 ll:list-none ll:flex-col ll:p-0">
                {observation.members.map((member) => (
                  <li
                    key={member.characterId}
                    className="ll:min-w-0 ll:px-[6px]"
                  >
                    <PlayerName
                      name={
                        member.nick ??
                        t("roster.characterUnknown", {
                          characterId: member.characterId,
                        })
                      }
                      level={member.lvl}
                      profession={member.prof}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ll:m-0 ll:px-[6px] ll:text-white/60">
                {t("roster.partyEmpty")}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
