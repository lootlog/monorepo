import { differenceInSeconds } from "date-fns";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Permission } from "@lootlog/schema/permissions";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useSession } from "@/hooks/auth/use-session";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import { getMemberDisplayRole } from "@lootlog/domain/member-display-role";
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
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { EventLoadError } from "./components/event-load-error";
import { EventKillDetailSkeleton } from "./event-kill-detail-skeleton";
import { getKillDetailErrorKind } from "./utils/kill-detail-error";
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
  const { data: accessPolicy } = useGuildPermissions();

  const canEditPoints =
    Boolean(accessPolicy?.allows(Permission.OWNER)) ||
    Boolean(accessPolicy?.allows(Permission.ADMIN));

  const queryGuildId = guildId ?? "";
  const queryEventId = eventId ?? "";
  const queryHeroId = heroId ?? "";
  const queryKillId = killId ?? "";

  const { data, isLoading, error, isFetching, refetch } = useKillDetail({
    guildId: queryGuildId,
    eventId: queryEventId,
    heroId: queryHeroId,
    killId: queryKillId,
  });

  const {
    data: matchingLoots,
    isLoading: isLootsLoading,
    isError: lootsHasError,
    isFetching: isFetchingLoots,
    refetch: refetchLoots,
  } = useMatchingLoots({
    guildId: queryGuildId,
    world: data?.kill.heroNpc.event.world ?? "",
    killedAt: data?.kill.killedAt ?? "",
    npcName: data?.kill.heroNpc.npcName ?? "",
    enabled: Boolean(data),
  });

  const loots = matchingLoots ?? [];

  if (isLoading) {
    return <EventKillDetailSkeleton />;
  }

  const isUnavailable = getKillDetailErrorKind(error) !== "failure";

  if (!data || isUnavailable) {
    return (
      <EventLoadError
        backTo="hero"
        guildId={queryGuildId}
        eventId={queryEventId}
        heroId={queryHeroId}
        error={error}
        titles={{
          403: t("events.killDetail.accessDenied"),
          404: t("events.killDetail.notFound"),
          500: t("events.killDetail.error"),
        }}
        onRetry={() => refetch()}
      />
    );
  }

  const { kill, eventConfig } = data;
  const participants = kill.points ?? [];

  const getMemberRoleColors = () => {
    const colors = new Map<number, string>();

    for (const participant of participants) {
      const roleColor = getCustomRoleCssColor(
        getMemberDisplayRole(participant.member.roles)?.color,
      );

      if (roleColor) colors.set(participant.member.id, roleColor);
    }

    return colors;
  };

  const getHighlightedRuleIds = () => {
    const currentDiscordId = session?.user?.discordId;

    return Array.from(
      new Set(
        participants.flatMap((participant) => {
          if (participant.member.userId !== currentDiscordId) return [];

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
            .filter((ruleId): ruleId is string => ruleId.trim().length > 0);

          return [...evaluatedRuleIds, ...bonusBreakdownRuleIds];
        }),
      ),
    );
  };

  const getTimingViewModel = () => {
    const respawnDurationSeconds = kill.respawnDurationSeconds;
    const windowDurationSeconds = kill.windowDurationSeconds;

    const respawnDurationText =
      respawnDurationSeconds !== null && respawnDurationSeconds !== undefined
        ? formatDurationHuman(respawnDurationSeconds)
        : formatRespawnWindow(kill.minSpawnTimeAtKill, kill.killedAt);

    const windowDurationText =
      windowDurationSeconds !== null && windowDurationSeconds !== undefined
        ? formatDurationHuman(windowDurationSeconds)
        : formatRespawnWindow(kill.minSpawnTimeAtKill, kill.maxSpawnTimeAtKill);

    const hasDurations =
      windowDurationSeconds !== null &&
      windowDurationSeconds !== undefined &&
      respawnDurationSeconds !== null &&
      respawnDurationSeconds !== undefined;

    const fasterThanMaxSeconds = hasDurations
      ? Math.max(0, windowDurationSeconds - respawnDurationSeconds)
      : null;

    const respawnComparedToMaxPercentage =
      hasDurations && windowDurationSeconds > 0
        ? Math.max(
            0,
            Math.round((respawnDurationSeconds / windowDurationSeconds) * 100),
          )
        : null;

    return {
      respawnDurationText,
      windowDurationText,
      fasterThanMaxText:
        fasterThanMaxSeconds !== null &&
        fasterThanMaxSeconds !== undefined &&
        fasterThanMaxSeconds > 0
          ? formatDurationHuman(fasterThanMaxSeconds)
          : null,
      respawnComparedToMaxPercentage,
    };
  };

  const memberRoleColors = getMemberRoleColors();
  const highlightedRuleIds = getHighlightedRuleIds();

  const {
    respawnDurationText,
    windowDurationText,
    fasterThanMaxText,
    respawnComparedToMaxPercentage,
  } = getTimingViewModel();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea className="min-h-0 min-w-0 max-w-full flex-1">
        <div className="flex w-full min-w-0 max-w-full flex-col gap-3 overflow-x-hidden px-3 py-3">
          {error && (
            <QueryErrorNotice
              message={t("events.killDetail.error")}
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          )}
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
                eventId={queryEventId}
                heroId={queryHeroId}
                killId={queryKillId}
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
                hasError={lootsHasError}
                onRetry={() => void refetchLoots()}
                isRetrying={isFetchingLoots}
                guildId={queryGuildId}
                npcName={kill.heroNpc.npcName}
              />

              <MultipliersCard
                eventConfig={eventConfig}
                highlightedRuleIds={highlightedRuleIds}
                t={t}
              />
            </aside>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
