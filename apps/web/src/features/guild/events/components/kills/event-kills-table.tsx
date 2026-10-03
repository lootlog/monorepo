import { EmptyState } from "@/components/common/empty-state";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useTranslation } from "react-i18next";
import { useTable } from "@tanstack/react-table";
import { CircleAlert, RotateCcw, Skull } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
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

  const Container = ({ history: SectionCard, preview: "section" } as const)[
    variant
  ];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div aria-busy="true" aria-label={t("events.kills.loading")}>
          <Skeleton className="h-10 w-full rounded-none border-b border-border" />
          {Array.from({ length: isPreview ? 5 : 7 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full rounded-none border-b border-border last:border-b-0"
            />
          ))}
        </div>
      );
    }

    if (hasError && kills.length === 0) {
      return (
        <EmptyState
          icon={CircleAlert}
          title={t("events.error")}
          action={
            <Button
              type="button"
              variant="outline"
              loading={isRetrying ?? false}
              icon=<RotateCcw className="size-3.5" />
              onClick={onRetry}
            >
              {t("common.actions.retry")}
            </Button>
          }
        />
      );
    }

    if (kills.length === 0 && !hasNextPage) {
      return <EmptyState icon={Skull} title={t("events.kills.noKills")} />;
    }

    return (
      <Table className="w-full table-auto xl:table-fixed">
        <TanStackTableHeader
          table={table}
          className="sticky top-0 z-10 bg-background"
          rowClassName="border-b-1! border-border"
          getHeadClassName={(header) =>
            cn(
              "whitespace-nowrap align-middle",
              getColumnClassName(header.column.id, isPreview),
            )
          }
        />
        <TanStackTableBody
          table={table}
          rowClassName="h-14 border-b border-border hover:bg-muted/40"
          getCellClassName={(cell) =>
            cn(
              "h-14 overflow-hidden align-middle",
              getColumnClassName(cell.column.id, isPreview),
            )
          }
        />
        {(!isPreview || hasError) && (
          <TableBody>
            <TableRow ref={loaderRowRef} className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-14 text-center text-xs text-muted-foreground"
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
    );
  };

  return (
    <Container className="w-full min-w-0 overflow-hidden">
      {!isPreview && (
        <SectionCardHeader icon={Skull} title={t("events.kills.title")} />
      )}
      {renderContent()}
    </Container>
  );
};
