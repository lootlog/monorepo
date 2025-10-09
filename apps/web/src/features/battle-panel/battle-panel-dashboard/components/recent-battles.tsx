import { BattlesList } from "@/features/battle-panel/battle-panel-battles-list/components/battles-list";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

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

          <Button variant="outline" size="sm" asChild>
            <Link to="/@me/battle-panel/battles">
              Zobacz wszystkie
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
      <Separator />
      <BattlesList params={{ page: 1, limit: 10 }} showPagination={false} />
    </div>
  );
}
