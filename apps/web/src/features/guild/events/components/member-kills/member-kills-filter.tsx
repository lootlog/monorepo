import { useTranslation } from "react-i18next";
import { Swords } from "lucide-react";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";

type HeroFilterOption = {
  id: string;
  npcId?: number | null;
  npcIcon?: string | null;
  npcName: string;
};

type MemberKillsFilterProps = {
  heroes: HeroFilterOption[];
  selectedHeroId?: string;
  onSelectedHeroChange: (heroId?: string) => void;
};

export const MemberKillsFilter = ({
  heroes,
  selectedHeroId,
  onSelectedHeroChange,
}: MemberKillsFilterProps) => {
  const { t } = useTranslation();

  if (heroes.length <= 1) {
    return null;
  }

  return (
    <div>
      <Tabs
        value={selectedHeroId ?? "all"}
        onValueChange={(value) =>
          onSelectedHeroChange(value === "all" ? undefined : value)
        }
      >
        <EventScrollableTabsList className="border border-border/70 bg-muted/30">
          <TabsTrigger value="all" className="min-h-9 text-xs">
            {t("events.kills.allHeroes")}
          </TabsTrigger>
          {heroes.map((hero) => (
            <TabsTrigger
              key={hero.id}
              value={hero.id}
              className="min-h-9 text-xs"
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
