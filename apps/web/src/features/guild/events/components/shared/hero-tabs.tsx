import { FilterBar } from "@/components/common/filter-bar";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EventScrollableTabsList } from "./event-scrollable-tabs-list";

const ALL_HEROES_VALUE = "all";

type HeroTabsProps = {
  heroes: readonly { id: string; npcName: string }[];
  /** Which hero field identifies a tab; `undefined` selects "all heroes". */
  valueKey?: "id" | "npcName";
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  /** Adds a leading tab that clears the hero selection. */
  includeAll?: boolean;
  /**
   * `page` stands alone as the page's filter bar; `section` sits under a
   * section card header.
   */
  placement: "page" | "section";
};

/** Switches the hero a view shows; hidden while the event has one hero. */
export const HeroTabs = ({
  heroes,
  valueKey = "id",
  value,
  onValueChange,
  includeAll = false,
  placement,
}: HeroTabsProps) => {
  const { t } = useTranslation();

  if (heroes.length <= 1) {
    return null;
  }

  const tabs = (
    <Tabs
      value={value ?? (includeAll ? ALL_HEROES_VALUE : heroes[0]?.[valueKey])}
      onValueChange={(nextValue: string) =>
        onValueChange(nextValue === ALL_HEROES_VALUE ? undefined : nextValue)
      }
      className={
        placement === "section"
          ? "border-b border-border/70 px-3 py-2"
          : "min-w-0 flex-1"
      }
    >
      <EventScrollableTabsList ariaLabel={t("events.heroTabs.label")}>
        {includeAll && (
          <TabsTrigger value={ALL_HEROES_VALUE} className="h-8 text-xs">
            {t("events.kills.allHeroes")}
          </TabsTrigger>
        )}
        {heroes.map((hero) => (
          <TabsTrigger
            key={hero.id}
            value={hero[valueKey]}
            className="h-8 text-xs"
          >
            <Swords className="size-3" aria-hidden="true" />
            {hero.npcName}
          </TabsTrigger>
        ))}
      </EventScrollableTabsList>
    </Tabs>
  );

  if (placement === "section") {
    return tabs;
  }

  return <FilterBar>{tabs}</FilterBar>;
};
