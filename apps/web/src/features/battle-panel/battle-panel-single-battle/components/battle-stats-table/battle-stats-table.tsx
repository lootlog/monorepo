import { DataTable } from "@/components/table/data-table";
import { columns } from "@/features/battle-panel/battle-panel-single-battle/components/battle-stats-table/battle-stats-table-columns";
import { Battle } from "@/hooks/api/battle-log/use-battles";
import { Separator } from "@lootlog/ui/components/separator";
import { ChartArea } from "lucide-react";
import { Switch } from "@lootlog/ui/components/switch";
import { Label } from "@lootlog/ui/components/label";

interface BattleStatsTableProps {
  battle: Battle;
}

export function BattleStatsTable({ battle }: BattleStatsTableProps) {
  return (
    <div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <ChartArea className="h-5 w-5" />
            Statystyki walki
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="detailed-view">Widok zaawansowany</Label>
            <Switch id="detailed-view" />
          </div>
        </div>
      </div>
      <Separator />
      <DataTable columns={columns} data={battle.warriors} />
    </div>
  );
}
