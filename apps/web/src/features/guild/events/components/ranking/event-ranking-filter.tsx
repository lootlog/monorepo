import { Swords } from "lucide-react";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import type { EventHeroNpc } from "../../types/api";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";

type EventRankingFilterProps = {
  heroes: EventHeroNpc[];
  selectedHeroName?: string | null;
  onSelectedHeroChange: (heroName: string) => void;
};

export const EventRankingFilter = ({
  heroes,
  selectedHeroName,
  onSelectedHeroChange,
}: EventRankingFilterProps) => {
  if (heroes.length <= 1 || !selectedHeroName) {
    return null;
  }

  return (
    <Tabs
      value={selectedHeroName}
      onValueChange={(heroName) => onSelectedHeroChange(heroName)}
    >
      <EventScrollableTabsList className="border border-border/70 bg-muted/30">
        {heroes.map((hero) => (
          <TabsTrigger
            key={hero.id}
            value={hero.npcName}
            className="min-h-9 flex-shrink-0 text-xs"
          >
            <Swords className="mr-1 size-3" />
            {hero.npcName}
          </TabsTrigger>
        ))}
      </EventScrollableTabsList>
    </Tabs>
  );
};
