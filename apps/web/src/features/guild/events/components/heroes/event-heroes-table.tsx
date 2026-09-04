import { useTranslation } from "react-i18next";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus, Swords } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Table } from "@lootlog/ui/components/table";
import { cn } from "cn";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { EventHeroNpc } from "../../types/api";
import {
  createEventHeroesTableColumns,
  type EventHeroTableRow,
} from "./event-heroes-table-columns";

type EventHeroesTableProps = {
  canManage: boolean;
  eventId: string;
  guildId: string;
  onAddHero: () => void;
  onDeleteHero: (heroId: string) => void;
  onEditHero: (hero: EventHeroNpc) => void;
  onManageMaps: (hero: EventHeroNpc) => void;
  rows: EventHeroTableRow[];
};

const getColumnClassName = (columnId: string) => {
  if (columnId === "hero") return "min-w-0";
  if (columnId === "maps" || columnId === "kills") {
    return "hidden w-0 text-right lg:table-cell lg:w-16";
  }
  if (columnId === "timer") return "w-24 text-right sm:w-28";
  if (columnId === "actions") return "w-16 text-right";
  return "";
};

export const EventHeroesTable = ({
  canManage,
  eventId,
  guildId,
  onAddHero,
  onDeleteHero,
  onEditHero,
  onManageMaps,
  rows,
}: EventHeroesTableProps) => {
  const { t } = useTranslation();
  const columns = createEventHeroesTableColumns({
    canManage,
    eventId,
    guildId,
    onDeleteHero,
    onEditHero,
    onManageMaps,
    t,
  });
  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="h-fit gap-0 overflow-hidden border-border bg-card p-0">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 py-2 pl-3 pr-4">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Swords className="size-4 shrink-0 text-yellow-500" />
          <span className="truncate">{t("events.heroes.title")}</span>
        </h2>
        {canManage ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 pl-3 pr-4!"
            onClick={onAddHero}
          >
            <Plus className="size-4" />
            {t("events.heroes.addButton")}
          </Button>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center text-muted-foreground">
          <Swords className="mb-2 size-7 opacity-50" />
          <p className="text-sm">{t("events.heroes.empty")}</p>
        </div>
      ) : (
        <Table className="w-full table-auto lg:table-fixed">
          <TanStackTableHeader
            table={table}
            className="bg-secondary/25"
            rowClassName="border-border/80"
            headClassName={(header) =>
              cn(
                "h-9 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                getColumnClassName(header.column.id),
              )
            }
          />
          <TanStackTableBody
            table={table}
            rowClassName="group h-14 border-border/70 hover:bg-muted/20"
            cellClassName={(cell) =>
              cn(
                "h-14 overflow-hidden p-2 align-middle",
                getColumnClassName(cell.column.id),
              )
            }
          />
        </Table>
      )}
    </Card>
  );
};
