import { cn } from "cn";
import { Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

type MemberEventMetaProps = {
  eventName: string;
  /** The place in the shown hero's ranking; absent across several heroes. */
  rankingPlace?: { position: number; playerCount: number };
};

/** What a member's event page is about, for its `DetailBar`. */
export const MemberEventMeta = ({
  eventName,
  rankingPlace,
}: MemberEventMetaProps) => {
  const { t } = useTranslation();

  return (
    <>
      <span className="text-xs leading-tight text-muted-foreground">
        {eventName}
      </span>
      {rankingPlace && (
        <span className="inline-flex items-center gap-1.5 text-xs leading-tight text-muted-foreground tabular-nums">
          <Trophy
            aria-hidden
            className={cn(
              "size-3.5 shrink-0",
              rankingPlace.position <= 3 && "text-primary",
            )}
          />
          {t("events.kills.memberRankingPlace", {
            position: rankingPlace.position,
            count: rankingPlace.playerCount,
          })}
        </span>
      )}
    </>
  );
};
