import { FilterBar } from "@/components/common/filter-bar";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
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
          ? "border-b border-sidebar-border"
          : "min-w-0 flex-1"
      }
    >
      <EventScrollableTabsList
        ariaLabel={t("events.heroTabs.label")}
        size={placement === "section" ? "default" : "lg"}
        variant={placement === "section" ? "flush" : "pill"}
      >
        {includeAll && (
          <TabsTrigger value={ALL_HEROES_VALUE}>
            {t("events.heroTabs.all")}
          </TabsTrigger>
        )}
        {heroes.map((hero) => (
          <TabsTrigger key={hero.id} value={hero[valueKey]}>
            {hero.npcName}
          </TabsTrigger>
        ))}
      </EventScrollableTabsList>
    </Tabs>
  );

  if (placement === "section") {
    return tabs;
  }

  // The heroes lead the bar, as view tabs, where a search would sit.
  return <FilterBar search={tabs} />;
};
