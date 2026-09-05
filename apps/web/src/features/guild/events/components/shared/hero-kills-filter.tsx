import { useTranslation } from "react-i18next";
import { Swords } from "lucide-react";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";

type HeroKillsFilterProps = {
  heroes: {
    id: string;
    npcName: string;
    npcId?: number | null;
    npcIcon?: string | null;
  }[];
  variant?: "event" | "member";
  selectedHeroId?: string;
  onSelectedHeroChange: (heroId?: string) => void;
};

export const HeroKillsFilter = ({
  heroes,
  variant = "event",
  selectedHeroId,
  onSelectedHeroChange,
}: HeroKillsFilterProps) => {
  const { t } = useTranslation();

  if (heroes.length <= 1) {
    return null;
  }

  return (
    <div
      className={
        variant === "event"
          ? "rounded-xl border border-border bg-card p-2"
          : undefined
      }
    >
      <Tabs
        value={selectedHeroId ?? "all"}
        onValueChange={(value) =>
          onSelectedHeroChange(value === "all" ? undefined : value)
        }
      >
        <EventScrollableTabsList
          className={
            variant === "member"
              ? "border border-border/70 bg-muted/30"
              : undefined
          }
        >
          <TabsTrigger
            value="all"
            className={
              variant === "event"
                ? "min-h-9 flex-shrink-0 text-xs"
                : "min-h-9 text-xs"
            }
          >
            {t("events.kills.allHeroes")}
          </TabsTrigger>
          {heroes.map((hero) => (
            <TabsTrigger
              key={hero.id}
              value={hero.id}
              className={
                variant === "event"
                  ? "min-h-9 flex-shrink-0 text-xs"
                  : "min-h-9 text-xs"
              }
            >
              <Swords className="mr-1 size-3" />
              {hero.npcName}
            </TabsTrigger>
          ))}
        </EventScrollableTabsList>
      </Tabs>
    </div>
  );
};
