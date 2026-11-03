import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Table } from "@lootlog/ui/components/table";
import { useTable } from "@tanstack/react-table";
import { FILTERED_TABLE_HEADER_CLASS } from "@/components/common/page-sticky-table-header";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import {
  HERO_SIGHTINGS_ACTIONS_COLUMN_ID,
  useHeroSightingsTableColumns,
} from "./use-hero-sightings-table-columns";

type HeroSightingsTableProps = {
  sightings: HeroSightingResponseDto[];
  now: number;
  showWorld: boolean;
  onOpenHistory: (sighting: HeroSightingResponseDto) => void;
};

/** The board as a table, on pages wide enough for one beside the sidebar. */
export const HeroSightingsTable = ({
  sightings,
  now,
  showWorld,
  onOpenHistory,
}: HeroSightingsTableProps) => {
  const columns = useHeroSightingsTableColumns({
    now,
    showWorld,
    onOpenHistory,
  });

  const table = useTable({
    features: coreTableFeatures,
    data: sightings,
    columns,
    getRowId: (sighting) => String(sighting.id),
  });

  return (
    <Table className="min-w-[960px] table-fixed border-b">
      <colgroup>
        <col className="w-[200px]" />
        <col className="w-[180px]" />
        <col />
        <col className="w-[200px]" />
        <col className="w-[220px]" />
        <col className="w-14" />
      </colgroup>
      <TanStackTableHeader
        table={table}
        className={FILTERED_TABLE_HEADER_CLASS}
        rowClassName="border-b-1! border-border hover:bg-transparent"
      />
      <TanStackTableBody
        table={table}
        rowHeaderColumnId="hero"
        rowClassName="h-14 border-b border-border hover:bg-muted/40"
        getCellClassName={(cell) =>
          cell.column.id === HERO_SIGHTINGS_ACTIONS_COLUMN_ID
            ? "py-3 text-right align-top"
            : "py-3 align-top"
        }
      />
    </Table>
  );
};
