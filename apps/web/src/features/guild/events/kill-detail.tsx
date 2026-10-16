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
import { useEventHeroProfession } from "./hooks/queries/use-event-hero-profession";
import { normalizeBonusBreakdown } from "./utils/normalize-bonus-breakdown";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
import { KillDetailColumns } from "./components/kills/kill-detail-columns";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { EventLoadError } from "./components/event-load-error";
import { EventKillDetailSkeleton } from "./event-kill-detail-skeleton";
import { getKillDetailErrorKind } from "./utils/kill-detail-error";
import { getAppliedRuleIdsForParticipant } from "./utils/scoring-applied-rules";

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

  const heroProf = useEventHeroProfession({
    guildId: queryGuildId,
    eventId: queryEventId,
    heroId: queryHeroId,
  });

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

  const memberRoleColors = getMemberRoleColors();
  const highlightedRuleIds = getHighlightedRuleIds();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea
        data-under-top-bar
        className="min-h-0 min-w-0 max-w-full flex-1"
      >
        {error && (
          <QueryErrorNotice
            message={t("events.killDetail.error")}
            onRetry={() => void refetch()}
            isRetrying={isFetching}
            className={LIST_TILE_RULE_CLASS}
          />
        )}
        <KillDetailSummary kill={kill} heroProf={heroProf} />

        <KillDetailColumns
          participants={
            <KillParticipantsCard
              participants={participants}
              guildId={guildId}
              eventId={eventId}
              killId={killId}
              canEdit={canEditPoints}
            />
          }
          maps={
            <KillMapsTimelineSection
              eventId={queryEventId}
              heroId={queryHeroId}
              killId={queryKillId}
              minSpawnTimeAtKill={kill.minSpawnTimeAtKill}
              killedAt={kill.killedAt}
              memberRoleColors={memberRoleColors}
              t={t}
            />
          }
          rules={
            <MultipliersCard
              eventConfig={eventConfig}
              highlightedRuleIds={highlightedRuleIds}
              t={t}
            />
          }
          loots={
            <MatchingLootsSection
              loots={loots}
              isLoading={isLootsLoading}
              hasError={lootsHasError}
              onRetry={() => void refetchLoots()}
              isRetrying={isFetchingLoots}
              guildId={queryGuildId}
              npcName={kill.heroNpc.npcName}
            />
          }
        />
      </ScrollArea>
    </div>
  );
};
