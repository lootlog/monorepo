import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { AlertCircle, Skull } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@lootlog/ui/components/table";
import { cn } from "@lootlog/ui/lib/utils";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { createEventKillsTableColumns } from "./event-kills-table-columns";

type EventKillsTableBaseProps = {
  eventId: string;
  guildId: string;
  hasError: boolean;
  isLoading: boolean;
  kills: HeroKill[];
};

type EventKillsTableHistoryProps = EventKillsTableBaseProps & {
  fetchNextPage: () => Promise<unknown> | unknown;
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
  const loaderRowRef = useRef<HTMLTableRowElement>(null);
  const {
    eventId,
    guildId,
    hasError,
    isLoading,
    kills,
    variant = "history",
  } = props;
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
  const table = useReactTable({
    columns,
    data: kills,
    getCoreRowModel: getCoreRowModel(),
  });

  useEffect(() => {
    if (!isPreview) {
      scrollElement?.scrollTo(0, 0);
    }
  }, [isPreview, resetKey, scrollElement]);

  useEffect(() => {
    const loaderRow = loaderRowRef.current;

    if (
      !loaderRow ||
      isPreview ||
      !scrollElement ||
      !hasNextPage ||
      hasError ||
      isFetchingNextPage ||
      !fetchNextPage ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchNextPage();
        }
      },
      {
        root: scrollElement,
        rootMargin: "240px 0px",
      },
    );

    observer.observe(loaderRow);

    return () => observer.disconnect();
  }, [
    fetchNextPage,
    hasError,
    hasNextPage,
    isFetchingNextPage,
    isPreview,
    scrollElement,
  ]);

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
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm">{t("events.error")}</p>
      </div>
    );
  }

  if (kills.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center text-muted-foreground">
        <Skull className="mb-2 size-6 opacity-50" />
        <p className="text-sm">{t("events.kills.noKills")}</p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "w-full min-w-0 overflow-hidden bg-card",
        !isPreview && "rounded-2xl border border-border",
      )}
    >
      <Table className="w-full table-auto xl:table-fixed">
        <TanStackTableHeader
          table={table}
          className="bg-secondary/25"
          rowClassName="border-border/80"
          headClassName={(header) =>
            cn(
              "h-9 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
              getColumnClassName(header.column.id, isPreview),
            )
          }
        />
        <TanStackTableBody
          table={table}
          rowClassName="group h-11 border-border/70 hover:bg-muted/20"
          cellClassName={(cell) =>
            cn(
              "h-11 overflow-hidden p-2 align-middle",
              getColumnClassName(cell.column.id, isPreview),
            )
          }
        />
        {!isPreview && (
          <TableBody>
            <TableRow ref={loaderRowRef} className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="h-11 text-center text-xs text-muted-foreground"
              >
                {hasError ? (
                  <span className="inline-flex items-center gap-2 text-destructive">
                    <AlertCircle className="size-4" />
                    {t("events.error")}
                  </span>
                ) : hasNextPage ? (
                  <span className="inline-flex items-center gap-2">
                    {isFetchingNextPage && (
                      <Spinner className="size-4 text-primary" />
                    )}
                    {t("events.kills.loading")}
                  </span>
                ) : (
                  t("events.kills.endOfList")
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </Table>
    </section>
  );
};
