import { useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

interface AvailableStatsSectionProps {
  availableStats: Array<{ key: string; label: string }>;
  onAddStat: (statKey: string) => void;
}

export const AvailableStatsSection = ({
  availableStats,
  onAddStat,
}: AvailableStatsSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAvailableStats = availableStats.filter((stat) =>
    stat.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (availableStats.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2 font-medium">
        Dostępne statystyki:
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj statystyki..."
          className="h-7 pl-7 pr-7 text-xs"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <ScrollArea className="h-48">
        <div className="space-y-1 pr-4">
          {filteredAvailableStats.length > 0 ? (
            filteredAvailableStats.map((stat) => (
              <div
                key={stat.key}
                className="flex items-center gap-2 bg-background border rounded px-2 py-1.5 text-sm"
              >
                <span className="flex-1">{stat.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddStat(stat.key)}
                  className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground italic py-2 text-center">
              Nie znaleziono statystyk
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
