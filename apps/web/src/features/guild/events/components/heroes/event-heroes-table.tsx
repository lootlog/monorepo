import { BandSection } from "@lootlog/ui/components/band-section";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { Plus, Swords } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Table } from "@lootlog/ui/components/table";
import { cn } from "cn";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { EventHeroNpc } from "@/lib/api/event-types";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import {
  createEventHeroesTableColumns,
  type EventHeroTableRow,
} from "./event-heroes-table-columns";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { TableScroller } from "@/components/common/table-scroller";
import { useMediaQuery } from "usehooks-ts";
import { EventHeroTiles } from "./event-hero-tiles";

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

  if (columnId === "maps" || columnId === "kills") return "w-16 text-right";

  if (columnId === "timer") return "w-28 text-right";

  if (columnId === "mine") return "w-24 text-right";

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
  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);
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
        <EmptyState compact icon={Swords} title={t("events.heroes.empty")} />
      ) : usesTable ? (
        <TableScroller>
          <Table className="w-full table-fixed">
            <TanStackTableHeader
              table={table}
              className="bg-sidebar"
              rowClassName="border-b-1! border-border hover:bg-transparent"
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
        </TableScroller>
      ) : (
        <EventHeroTiles
          rows={rows}
          guildId={guildId}
          eventId={eventId}
          canManage={canManage}
          showStandings={showStandings}
          onEditHero={onEditHero}
          onManageMaps={onManageMaps}
          onRequestDeleteHero={setHeroToDelete}
        />
      )}
      <ConfirmDialog
        open={heroToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setHeroToDelete(null);
        }}
        title={t("events.heroes.deleteTitle")}
        description={t("events.heroes.deleteDescription", {
          name: heroToDelete?.npcName ?? "",
        })}
        confirmButtonLabel={t("events.heroes.deleteAction")}
        cancelButtonLabel={t("common.cancel")}
        pending={isDeleteHeroPending}
        onConfirm={async () => {
          if (heroToDelete) await onDeleteHero(heroToDelete.id);
        }}
      />
    </BandSection>
  );
};
