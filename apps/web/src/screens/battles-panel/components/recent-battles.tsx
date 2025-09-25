import { BattlesList } from "@/screens/battles-panel/components/battles-list";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import { ChevronRight } from "lucide-react";

export function RecentBattles() {
  return (
    <div className="flex flex-col">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Ostatnie walki</h2>
            <p className="text-muted-foreground text-sm">
              Twoje ostatnie walki
            </p>
          </div>
          <Button variant="outline" size="sm">
            Zobacz wszystkie
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
      <Separator />
      <BattlesList />
    </div>
  );
}
