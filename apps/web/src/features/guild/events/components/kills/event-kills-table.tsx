import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { Skull } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@lootlog/ui/components/table";
import { cn } from "cn";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { KillHistoryEntry } from "@lootlog/client/main";
import { createEventKillsTableColumns } from "./event-kills-table-columns";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { useInfiniteScrollSentinel } from "@/hooks/utils/use-infinite-scroll-sentinel";
import { useResetScrollTop } from "@/hooks/utils/use-virtual-infinite-scroll";
import { EventReadError } from "../shared/event-read-error";
import { EventHistoryPaginationStatus } from "../shared/event-history-pagination-status";

type EventKillsTableBaseProps = {
  eventId: string;
  guildId: string;
  hasError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  isRetrying?: boolean;
  kills: KillHistoryEntry[];
};

type EventKillsTableHistoryProps = EventKillsTableBaseProps & {
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  resetKey: string;
  scrollElement: HTMLDivElement | null;
  variant?: "history";
};

type EventKillsTablePreviewProps = EventKillsTableBaseProps & {
  variant: "preview";
};

type EventKillsTableProps =
  | EventKillsTableHistoryProps
  | EventKillsTablePreviewProps;

const getEventKillsTableVariant = (props: EventKillsTableProps) =>
  props.variant === "preview" ? "preview" : "history";

const getColumnClassName = (columnId: string, isPreview: boolean) => {
  if (columnId === "monster") {
    return "min-w-0";
  }

  if (columnId === "date") {
    if (isPreview) {
      return "hidden w-0";
    }

    return "hidden w-0 sm:table-cell sm:w-28 lg:w-36";
  }

  if (columnId === "respawnTime") {
    return "hidden w-0 text-right xl:table-cell xl:w-32";
  }

  if (columnId === "participants") {
    if (isPreview) {
      return "hidden w-0";
    }

    return "hidden w-0 text-right lg:table-cell lg:w-28";
  }

  return "";
};

export const EventKillsTable = (props: EventKillsTableProps) => {
  const { t } = useTranslation();

  const { eventId, guildId, hasError, isLoading, kills, onRetry, isRetrying } =
    props;

  const variant = getEventKillsTableVariant(props);
  const isPreview = variant === "preview";
  const historyProps = props.variant === "preview" ? undefined : props;
  const fetchNextPage = historyProps?.fetchNextPage;
  const hasNextPage = historyProps?.hasNextPage ?? false;
  const isFetchingNextPage = historyProps?.isFetchingNextPage ?? false;
  const resetKey = historyProps?.resetKey;
  const scrollElement = historyProps?.scrollElement ?? null;

  const columns = createEventKillsTableColumns({
    eventId,
    guildId,
    isPreview,
    t,
  });

  const table = useTable({
    features: coreTableFeatures,
    columns,
    data: kills,
  });

  useResetScrollTop({
    enabled: !isPreview,
    getScrollElement: () => scrollElement,
    resetKey,
  });

  const loaderRowRef = useInfiniteScrollSentinel<HTMLTableRowElement>({
    enabled: !hasError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    scrollElement,
  });

  if (isLoading) {
    return (
      <div
        aria-label={t("events.kills.loading")}
        className={cn(
          "overflow-hidden",
          !isPreview && "rounded-2xl border border-border",
        )}
      >
        <Skeleton className="h-9 w-full rounded-none" />
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-11 w-full rounded-none border-t border-border/70"
          />
        ))}
      </div>
    );
  }

  if (hasError && kills.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <EventReadError onRetry={onRetry} isRetrying={isRetrying} />
      </div>
    );
  }

  if (kills.length === 0 && !hasNextPage) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center text-muted-foreground">
        <Skull className="mb-2 size-6 opacity-50" />
        <p className="text-sm">{t("events.kills.noKills")}</p>
      </div>
    );
  }

  const Container = ({ history: SectionCard, preview: "section" } as const)[
    variant
  ];

  return (
    <Container className="w-full min-w-0 overflow-hidden">
      {!isPreview && (
        <SectionCardHeader icon={Skull} title={t("events.kills.title")} />
      )}
      <Table className="w-full table-auto xl:table-fixed">
        <TanStackTableHeader
          table={table}
          className="bg-secondary/25"
          rowClassName="border-border/80"
          getHeadClassName={(header) =>
            cn(
              "h-9 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
              getColumnClassName(header.column.id, isPreview),
            )
          }
        />
        <TanStackTableBody
          table={table}
          rowClassName="group h-11 border-border/70 hover:bg-muted/20"
          getCellClassName={(cell) =>
            cn(
              "h-11 overflow-hidden p-2 align-middle",
              getColumnClassName(cell.column.id, isPreview),
            )
          }
        />
        {(!isPreview || hasError) && (
          <TableBody>
            <TableRow ref={loaderRowRef} className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-11 text-center text-xs text-muted-foreground"
              >
                <EventHistoryPaginationStatus
                  hasError={hasError}
                  hasNextPage={hasNextPage}
                  isFetching={isRetrying ?? isFetchingNextPage}
                  onRetry={onRetry}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </Table>
    </Container>
  );
};
