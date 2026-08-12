import { useTranslation } from "react-i18next";
import { Swords } from "lucide-react";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import type { EventHeroNpc } from "../../types/api";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";

type EventKillsFilterProps = {
  heroes: EventHeroNpc[];
  selectedHeroId?: string;
  onSelectedHeroChange: (heroId?: string) => void;
};

export const EventKillsFilter = ({
  heroes,
  selectedHeroId,
  onSelectedHeroChange,
}: EventKillsFilterProps) => {
  const { t } = useTranslation();

  if (heroes.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <Tabs
        value={selectedHeroId ?? "all"}
        onValueChange={(value) =>
          onSelectedHeroChange(value === "all" ? undefined : value)
        }
      >
        <EventScrollableTabsList>
          <TabsTrigger value="all" className="min-h-9 flex-shrink-0 text-xs">
            {t("events.kills.allHeroes")}
          </TabsTrigger>
          {heroes.map((hero) => (
            <TabsTrigger
              key={hero.id}
              value={hero.id}
              className="min-h-9 flex-shrink-0 text-xs"
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
