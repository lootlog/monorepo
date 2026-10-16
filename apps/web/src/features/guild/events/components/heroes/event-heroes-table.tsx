import { BandSection } from "@/components/common/band-section";
import { EmptyState } from "@/components/common/empty-state";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { Plus, Swords } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
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
  showStandings?: boolean;
};

const getColumnClassName = (columnId: string) => {
  if (columnId === "hero") return "min-w-0";

  if (columnId === "maps" || columnId === "kills") {
    return "hidden w-0 text-right lg:table-cell lg:w-16";
  }

  if (columnId === "timer") return "w-28 text-right";

  // Below `lg` the hero's own line names the place.
  if (columnId === "mine") return "hidden w-0 text-right lg:table-cell lg:w-24";

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
  showStandings = false,
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
    showStandings,
    t,
  });

  const table = useTable({
    features: coreTableFeatures,
    columns,
    data: rows,
  });

  return (
    <BandSection
      id="event-heroes"
      title={t("events.heroes.title")}
      tiled
      trailing={
        canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddHero}
            icon=<Plus className="size-4" />
          >
            {t("events.heroes.addButton")}
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <EmptyState icon={Swords} title={t("events.heroes.empty")} />
      ) : (
        <Table className="w-full table-fixed">
          <TanStackTableHeader
            table={table}
            className="bg-sidebar"
            rowClassName="border-b-1! border-sidebar-border"
            getHeadClassName={(header) =>
              cn(
                "whitespace-nowrap align-middle",
                getColumnClassName(header.column.id),
              )
            }
          />
          <TanStackTableBody
            table={table}
            rowClassName="h-14 border-b border-sidebar-border hover:bg-muted/40"
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
    </BandSection>
  );
};
