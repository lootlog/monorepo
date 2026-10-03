import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";

type EventHeroContextProps = {
  /** The hero a page is narrowed to; none means every hero of the event. */
  heroName?: string | null;
};

/** Page-header metadata naming the hero an events subpage shows. */
export const EventHeroContext = ({ heroName }: EventHeroContextProps) => {
  const { t } = useTranslation();

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Swords className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">
        {heroName ?? t("events.kills.allHeroes")}
      </span>
    </span>
  );
};
