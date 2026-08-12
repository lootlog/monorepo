import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Skull } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import type { EventMemberKill } from "../../hooks/queries/use-event-member-kill-history";
import { MemberKillRow } from "./member-kill-row";

type MemberKillsListProps = {
  guildId: string;
  eventId: string;
  scrollElement: HTMLDivElement;
  resetKey: string;
  allKills: EventMemberKill[];
  isLoading: boolean;
  hasError: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown> | unknown;
};

export const MemberKillsList = ({
  guildId,
  eventId,
  scrollElement,
  resetKey,
  allKills,
  isLoading,
  hasError,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: MemberKillsListProps) => {
  const { t } = useTranslation();
  const loaderRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    scrollElement.scrollTo(0, 0);
  }, [resetKey, scrollElement]);

  useEffect(() => {
    const loaderRow = loaderRowRef.current;

    if (
      !loaderRow ||
      !hasNextPage ||
      isFetchingNextPage ||
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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, scrollElement]);

  if (isLoading) {
    return (
      <div
        aria-label={t("events.kills.loading")}
        className="overflow-hidden rounded-2xl border border-border"
      >
        <Skeleton className="h-9 w-full rounded-none" />
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-14 w-full rounded-none border-t border-border/70"
          />
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm">{t("events.error")}</p>
      </div>
    );
  }

  if (allKills.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center text-muted-foreground">
        <Skull className="mb-2 size-6 opacity-50" />
        <p className="text-sm">{t("events.kills.noKills")}</p>
      </div>
    );
  }

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <Table className="w-full table-auto xl:table-fixed">
        <TableHeader className="bg-secondary/25">
          <TableRow className="border-border/80 hover:bg-transparent">
            <TableHead className="h-9 min-w-0 px-2 text-[10px] uppercase tracking-[0.08em]">
              {t("events.kills.monster")}
            </TableHead>
            <TableHead className="hidden h-9 w-0 px-2 text-[10px] uppercase tracking-[0.08em] sm:table-cell sm:w-28 lg:w-36">
              {t("events.kills.date")}
            </TableHead>
            <TableHead className="hidden h-9 w-0 px-2 text-right text-[10px] uppercase tracking-[0.08em] xl:table-cell xl:w-28">
              {t("events.kills.timeCoverage")}
            </TableHead>
            <TableHead className="hidden h-9 w-0 px-2 text-right text-[10px] uppercase tracking-[0.08em] xl:table-cell xl:w-40">
              {t("events.kills.trackingDurationTime")}
            </TableHead>
            <TableHead className="h-9 w-20 px-2 text-right text-[10px] uppercase tracking-[0.08em] sm:w-24">
              {t("events.kills.points")}
            </TableHead>
            <TableHead className="h-9 w-11 px-2">
              <span className="sr-only">{t("events.kills.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allKills.map((kill) => (
            <MemberKillRow
              key={kill.id}
              kill={kill}
              guildId={guildId}
              eventId={eventId}
            />
          ))}
          <TableRow ref={loaderRowRef} className="hover:bg-transparent">
            <TableCell
              colSpan={6}
              className="h-12 text-center text-xs text-muted-foreground"
            >
              {hasNextPage ? (
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
      </Table>
    </section>
  );
};
