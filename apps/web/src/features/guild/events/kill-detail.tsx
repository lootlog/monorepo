import { differenceInSeconds } from "date-fns";
import { Link, useParams } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Permission } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useSession } from "@/hooks/auth/use-session";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { KillDetailSummary } from "./components/kills/kill-detail-summary";
import { KillMapsTimelineSection } from "./components/kills/kill-maps-timeline-section";
import { KillParticipantsCard } from "./components/kills/kill-participants-card";
import { MatchingLootsSection } from "./components/kills/matching-loots-section";
import { MultipliersCard } from "./components/stats/multipliers-card";
import { useKillDetail } from "./hooks/queries/use-kill-detail";
import { useMatchingLoots } from "./hooks/queries/use-matching-loots";
import { formatDurationHuman } from "./utils/format-duration";
import { normalizeBonusBreakdown } from "./utils/normalize-bonus-breakdown";
import { getAppliedRuleIdsForParticipant } from "./utils/scoring-applied-rules";

const formatRespawnWindow = (minSpawn: string, maxSpawn: string): string => {
  const minDate = new Date(minSpawn);
  const maxDate = new Date(maxSpawn);
  const differenceSeconds = Math.max(0, differenceInSeconds(maxDate, minDate));
  return formatDurationHuman(differenceSeconds);
};

export const KillDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId, killId } = useParams({ strict: false });
  const { data: session } = useSession();
  const { data: permissions } = useGuildPermissions();
  const canEditPoints =
    Boolean(permissions?.includes(Permission.OWNER)) ||
    Boolean(permissions?.includes(Permission.ADMIN));
  const { data, isLoading, error } = useKillDetail({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    heroId: heroId ?? "",
    killId: killId ?? "",
  });
  const { data: matchingLoots, isLoading: isLootsLoading } = useMatchingLoots({
    guildId: guildId ?? "",
    world: data?.kill.heroNpc.event.world ?? "",
    killedAt: data?.kill.killedAt ?? "",
    npcName: data?.kill.heroNpc.npcName ?? "",
    enabled: Boolean(data),
  });
  const loots = matchingLoots ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-3 py-3">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 p-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-border/70 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="m-3 h-8 rounded-md" />
            ))}
          </div>
        </section>
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <section
            key={sectionIndex}
            className="overflow-hidden rounded-2xl border border-border bg-card p-3"
          >
            <Skeleton className="mb-3 h-4 w-36" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, rowIndex) => (
                <Skeleton key={rowIndex} className="h-11 rounded-md" />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {t("events.killDetail.notFound")}
        </p>
        <Button
          variant="outline"
          render={
            <Link
              to="/$guildId/events/$eventId/heroes/$heroId"
              params={{
                guildId: guildId ?? "",
                eventId: eventId ?? "",
                heroId: heroId ?? "",
              }}
            >
              {t("events.common.backToHero")}
            </Link>
          }
          nativeButton={false}
        />
      </div>
    );
  }

  const { kill, eventConfig } = data;
  const participants = kill.points ?? [];
  const memberRoleColors = new Map<number, string>();
  for (const participant of participants) {
    const roleColor = getCustomRoleCssColor(
      participant.member.roles?.[0]?.color,
    );
    if (roleColor) {
      memberRoleColors.set(participant.member.id, roleColor);
    }
  }
  const currentDiscordId = session?.user?.discordId;
  const highlightedRuleIds = Array.from(
    new Set(
      participants
        .filter((participant) => participant.member.userId === currentDiscordId)
        .flatMap((participant) => {
          const evaluatedRuleIds = getAppliedRuleIdsForParticipant({
            kill,
            participant,
            scoringRules: eventConfig.scoringRules,
            assignedMembersCount: participants.length,
          });
          const bonusBreakdownRuleIds = normalizeBonusBreakdown(
            participant.bonusBreakdown,
          )
            .map((bonus) => bonus.ruleId)
            .filter(
              (ruleId): ruleId is string =>
                typeof ruleId === "string" && ruleId.trim().length > 0,
            );

          return [...evaluatedRuleIds, ...bonusBreakdownRuleIds];
        }),
    ),
  );
  const respawnDurationText =
    typeof kill.respawnDurationSeconds === "number"
      ? formatDurationHuman(kill.respawnDurationSeconds)
      : formatRespawnWindow(kill.minSpawnTimeAtKill, kill.killedAt);
  const windowDurationText =
    typeof kill.windowDurationSeconds === "number"
      ? formatDurationHuman(kill.windowDurationSeconds)
      : formatRespawnWindow(kill.minSpawnTimeAtKill, kill.maxSpawnTimeAtKill);
  const fasterThanMaxSeconds =
    typeof kill.windowDurationSeconds === "number" &&
    typeof kill.respawnDurationSeconds === "number"
      ? Math.max(0, kill.windowDurationSeconds - kill.respawnDurationSeconds)
      : null;
  const respawnComparedToMaxPercentage =
    typeof kill.windowDurationSeconds === "number" &&
    typeof kill.respawnDurationSeconds === "number" &&
    kill.windowDurationSeconds > 0
      ? Math.max(
          0,
          Math.round(
            (kill.respawnDurationSeconds / kill.windowDurationSeconds) * 100,
          ),
        )
      : null;
  const fasterThanMaxText =
    typeof fasterThanMaxSeconds === "number" && fasterThanMaxSeconds > 0
      ? formatDurationHuman(fasterThanMaxSeconds)
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea className="min-h-0 min-w-0 max-w-full flex-1 [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!w-full">
        <main className="flex w-full min-w-0 max-w-full flex-col gap-3 overflow-x-hidden px-3 py-3">
          <KillDetailSummary
            kill={kill}
            eventConfig={eventConfig}
            participantsCount={participants.length}
            lootCount={loots.length}
            respawnDurationText={respawnDurationText}
            windowDurationText={windowDurationText}
            fasterThanMaxText={fasterThanMaxText}
            respawnComparedToMaxPercentage={respawnComparedToMaxPercentage}
          />

          <div
            data-testid="kill-detail-content-grid"
            className="grid min-w-0 items-start gap-3 2xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]"
          >
            <div
              data-testid="kill-detail-primary-column"
              className="flex min-w-0 flex-col gap-3"
            >
              <KillParticipantsCard
                participants={participants}
                guildId={guildId}
                eventId={eventId}
                killId={killId}
                canEdit={canEditPoints}
              />

              <KillMapsTimelineSection
                eventId={eventId ?? ""}
                heroId={heroId ?? ""}
                killId={killId ?? ""}
                minSpawnTimeAtKill={kill.minSpawnTimeAtKill}
                killedAt={kill.killedAt}
                memberRoleColors={memberRoleColors}
                t={t}
              />
            </div>

            <aside
              data-testid="kill-detail-secondary-column"
              className="flex min-w-0 flex-col gap-3"
            >
              <MatchingLootsSection
                loots={loots}
                isLoading={isLootsLoading}
                guildId={guildId ?? ""}
                npcName={kill.heroNpc.npcName}
              />

              <MultipliersCard
                eventConfig={eventConfig}
                highlightedRuleIds={highlightedRuleIds}
                t={t}
              />
            </aside>
          </div>
        </main>
      </ScrollArea>
    </div>
  );
};
