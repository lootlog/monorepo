import { useState, useEffect } from "react";
import {
  useBattleFiltersStore,
  type Period,
} from "@/store/battle-filters.store";
import { usePlayerVsPlayer } from "@/hooks/api/battle-log/use-player-vs-player";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@lootlog/ui/components/pagination";
import { ScrollArea, ScrollBar } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import { PlayerTile } from "@/components/battle";
import { cn } from "@lootlog/ui/lib/utils";
import { useParams, useNavigate } from "@tanstack/react-router";
import { playerVsPlayerColumns } from "./player-vs-player-columns";

export function PlayerVsPlayerFullPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as {
    myId?: string;
    opponentId?: string;
  };

  const opponentId = params.opponentId ?? params.myId;

  const currentCharacterId = useBattleFiltersStore(
    (state) => state.currentCharacterId,
  );

  const filterPeriod = useBattleFiltersStore(
    (state) => state.getFilters(state.currentCharacterId).period,
  );
  const minLevel = useBattleFiltersStore(
    (state) => state.getFilters(state.currentCharacterId).minLevel,
  );
  const maxLevel = useBattleFiltersStore(
    (state) => state.getFilters(state.currentCharacterId).maxLevel,
  );

  const [period] = useState<Period>(filterPeriod || "30d");
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [opponentId, minLevel, maxLevel]);

  const { data, isLoading } = usePlayerVsPlayer({
    cursor,
    size: 20,
    characterId: currentCharacterId ?? params.myId,
    period,
    opponentId: opponentId ?? "",
    minLevel,
    maxLevel,
    includeTotal: true,
  });

  const handleNextPage = () => {
    if (data?.pagination.nextCursor) {
      setCursor(data.pagination.nextCursor);
    }
  };

  const handlePreviousPage = () => {
    if (data?.pagination.previousCursor) {
      setCursor(data.pagination.previousCursor);
    }
  };

  const handleBattleClick = (battleId: string) => {
    navigate({
      to: "/@me/battle-panel/battles/$battleId",
      params: { battleId },
    });
  };

  const opponentName = data?.battles[0]?.opponentWarrior.name || "Przeciwnik";
  const myCharacter = data?.battles[0]?.userWarrior;

  const table = useReactTable({
    data: data?.battles || [],
    columns: playerVsPlayerColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-3 bg-background border-b">
        <div className="flex items-center gap-3 mb-2">
          {myCharacter && (
            <PlayerTile
              player={{
                name: myCharacter.name,
                lvl: myCharacter.lvl,
                prof: myCharacter.prof,
                icon: myCharacter.icon,
              }}
              className="scale-90"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">
              {myCharacter?.name || "Twoja postać"} vs {opponentName}
            </h1>
            {myCharacter && (
              <p className="text-sm text-muted-foreground">
                Poziom {myCharacter.lvl} • Historia walk rankingowych
              </p>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className={cn("max-w-full flex-1 w-full")}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">Ładowanie danych...</p>
          </div>
        ) : !data || data.battles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
            <p className="text-muted-foreground">Brak danych do wyświetlenia</p>
          </div>
        ) : (
          <Table className="border-b">
            <TableHeader className="bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b-1! border-border"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="bg-background/30 cursor-pointer hover:bg-muted/50 border-b border-border"
                  onClick={() => handleBattleClick(row.original.battleId)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <div className="h-14 shrink-0 bg-background border-t py-4 flex items-center justify-between px-4">
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Łącznie:&nbsp;
          {data?.pagination?.total && <span>{data.pagination.total}</span>}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={handlePreviousPage}
                className={
                  !data?.pagination?.hasPrev
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={handleNextPage}
                className={
                  !data?.pagination?.hasNext
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
