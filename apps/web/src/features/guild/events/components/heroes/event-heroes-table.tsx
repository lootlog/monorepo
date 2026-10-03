import { EmptyState } from "@/components/common/empty-state";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { Plus, Swords } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Table } from "@lootlog/ui/components/table";
import { cn } from "cn";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { EventHeroNpc } from "../../types/api";
import { EventActionDialog } from "../dialogs/event-action-dialog";
import {
  createEventHeroesTableColumns,
  type EventHeroTableRow,
} from "./event-heroes-table-columns";
import { coreTableFeatures } from "@/lib/tanstack-table-features";

type EventHeroesTableProps = {
  canManage: boolean;
  eventId: string;
  guildId: string;
  onAddHero: () => void;
  onDeleteHero: (heroId: string) => Promise<void>;
  isDeleteHeroPending: boolean;
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
  isDeleteHeroPending,
  onEditHero,
  onManageMaps,
  rows,
}: EventHeroesTableProps) => {
  const { t } = useTranslation();
  const [heroToDelete, setHeroToDelete] = useState<EventHeroNpc | null>(null);

  const columns = createEventHeroesTableColumns({
    canManage,
    eventId,
    guildId,
    onRequestDeleteHero: setHeroToDelete,
    onEditHero,
    onManageMaps,
    t,
  });

  const table = useTable({
    features: coreTableFeatures,
    columns,
    data: rows,
  });

  return (
    <SectionCard className="h-fit gap-0 overflow-hidden border-border bg-card p-0">
      <SectionCardHeader
        icon={Swords}
        title={t("events.heroes.title")}
        actions={
          <>
            {canManage ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={onAddHero}
                icon=<Plus className="size-4" />
              >
                {t("events.heroes.addButton")}
              </Button>
            ) : null}
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon={Swords} title={t("events.heroes.empty")} />
      ) : (
        <Table className="w-full table-auto lg:table-fixed">
          <TanStackTableHeader
            table={table}
            className="sticky top-0 z-10 bg-background"
            rowClassName="border-b-1! border-border"
            getHeadClassName={(header) =>
              cn(
                "whitespace-nowrap align-middle",
                getColumnClassName(header.column.id),
              )
            }
          />
          <TanStackTableBody
            table={table}
            rowClassName="h-14 border-b border-border hover:bg-muted/40"
            getCellClassName={(cell) =>
              cn(
                "h-14 overflow-hidden align-middle",
                getColumnClassName(cell.column.id),
              )
            }
          />
        </Table>
      )}
      <EventActionDialog
        open={heroToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setHeroToDelete(null);
        }}
        eventName={heroToDelete?.npcName ?? ""}
        onConfirm={async () => {
          if (heroToDelete) await onDeleteHero(heroToDelete.id);
        }}
        isPending={isDeleteHeroPending}
        titleKey="events.heroes.deleteTitle"
        descriptionKey="events.heroes.deleteDescription"
        actionLabelKey="events.heroes.deleteAction"
        variant="destructive"
      />
    </SectionCard>
  );
};
