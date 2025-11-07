import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { PlayerTile } from "@/components/battle";
import { StatCard } from "./stat-card";

interface HeadToHeadRecord {
  opponentId: string;
  opponentName: string;
  opponentIcon: string;
  opponentProf: string;
  opponentLvl: number;
  wins: number;
  losses: number;
  totalBattles: number;
  winRate: number;
  lastBattleDate: string;
}

interface HeadToHeadTableProps {
  data: HeadToHeadRecord[];
  isLoading?: boolean;
  characterId?: string;
  onCharacterChange: (characterId: string | undefined) => void;
}

export function HeadToHeadTable({
  data,
  isLoading,
  characterId,
  onCharacterChange,
}: HeadToHeadTableProps) {
  return (
    <StatCard
      title="Bilans bezpośrednich starć"
      description="Historia walk z konkretnymi przeciwnikami (top 10)"
      characterId={characterId}
      onCharacterChange={onCharacterChange}
      allowAllCharacters
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Brak danych o walkach"
    >
      <div className="overflow-x-auto bg-muted/30 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Nazwa</TableHead>
              <TableHead className="text-center">Poziom</TableHead>
              <TableHead className="text-center">Profesja</TableHead>
              <TableHead className="text-center">W-P</TableHead>
              <TableHead className="text-center">Win %</TableHead>
              <TableHead className="text-right">Ostatnia walka</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record) => (
              <TableRow key={record.opponentId}>
                <TableCell>
                  <PlayerTile
                    player={{
                      name: record.opponentName,
                      lvl: record.opponentLvl,
                      prof: record.opponentProf,
                      icon: record.opponentIcon,
                    }}
                    className="scale-75"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {record.opponentName}
                </TableCell>
                <TableCell className="text-center">
                  {record.opponentLvl}
                </TableCell>
                <TableCell className="text-center">
                  {record.opponentProf}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-green-600 font-medium">
                    {record.wins}
                  </span>
                  &nbsp;-&nbsp;
                  <span className="text-red-600 font-medium">
                    {record.losses}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={
                      record.winRate >= 50
                        ? "text-green-600 font-medium"
                        : "text-red-600 font-medium"
                    }
                  >
                    {record.winRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(record.lastBattleDate), {
                    addSuffix: true,
                    locale: pl,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </StatCard>
  );
}
