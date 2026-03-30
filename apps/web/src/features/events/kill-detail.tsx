import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skull, AlertCircle, Frown, Hand, Package } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { pl } from "date-fns/locale";
import { Permission } from "@lootlog/types";
import { useKillDetail } from "./hooks/queries/use-kill-detail";
import { useMatchingLoots } from "./hooks/queries/use-matching-loots";
import { KillParticipantsCard } from "./components/kills/kill-participants-card";
import { MultipliersCard } from "./components/stats/multipliers-card";
import { LootsListItem } from "@/features/guild/components/loots-list/loots-list-item";
import { KillMapsTimelineSection } from "./components/kills/kill-maps-timeline-section";
import { NpcTile } from "@/components/tiles/npc-tile";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useSession } from "@/hooks/auth/use-session";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { getAppliedRuleIdsForParticipant } from "./utils/scoring-applied-rules";
import { formatDurationHuman } from "./utils/format-duration";
import { KillDetailStatsCard } from "./components/kills/kill-detail-stats-card";

const formatRespawnWindow = (minSpawn: string, maxSpawn: string): string => {
  const minDate = new Date(minSpawn);
  const maxDate = new Date(maxSpawn);
  const diffSeconds = Math.max(0, differenceInSeconds(maxDate, minDate));
  return formatDurationHuman(diffSeconds);
};

export const KillDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId, killId } = useParams({ strict: false });
  const { data: session } = useSession();

  const { data: permissions } = useGuildPermissions();
  const canEditPoints =
    permissions?.includes(Permission.OWNER) ||
    permissions?.includes(Permission.ADMIN);

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
    enabled: !!data,
  });

  const loots = matchingLoots ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.killDetail.notFound")}
        </p>
        <Link
          to="/$guildId/events/$eventId/heroes/$heroId"
          params={{
            guildId: guildId ?? "",
            eventId: eventId ?? "",
            heroId: heroId ?? "",
          }}
        >
          <Button variant="outline">{t("events.common.backToHero")}</Button>
        </Link>
      </div>
    );
  }

  const { kill, eventConfig } = data;
  const participants = kill.points ?? [];
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
          const bonusBreakdownRuleIds = (participant.bonusBreakdown ?? [])
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
    typeof fasterThanMaxSeconds === "number"
      ? formatDurationHuman(fasterThanMaxSeconds)
      : null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {kill.heroNpc.npcIcon ? (
                <NpcTile
                  npc={{
                    id: kill.heroNpc.npcId ?? 0,
                    name: kill.heroNpc.npcName,
                    icon: kill.heroNpc.npcIcon,
                  }}
                />
              ) : (
                <div className="rounded-xl bg-red-500/10 p-2 shadow-inner shadow-red-500/10">
                  <Skull className="size-4 text-red-500" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t("events.killDetail.title")}
                </p>
                <h2 className="truncate text-base font-semibold leading-tight">
                  {kill.heroNpc.npcName}
                </h2>
                <p className="text-xs text-muted-foreground leading-tight">
                  {format(new Date(kill.killedAt), "d MMMM yyyy, HH:mm:ss", {
                    locale: pl,
                  })}
                </p>
              </div>
            </div>
          </Card>

          {kill.isManualClose && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <Hand className="w-5 h-5 text-yellow-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-600">
                  {t(
                    "events.killDetail.manualCloseTitle",
                    "Ręczne zamknięcie okna",
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "events.killDetail.manualCloseDescription",
                    "Okno respawnu zostało ręcznie zamknięte - heros mógł nie zostać zabity",
                  )}
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
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
                t={t}
              />
            </div>

            <div className="space-y-4">
              <KillDetailStatsCard
                kill={kill}
                participantsCount={participants.length}
                lootCount={loots.length}
                respawnDurationText={respawnDurationText}
                windowDurationText={windowDurationText}
                fasterThanMaxText={fasterThanMaxText}
                respawnComparedToMaxPercentage={respawnComparedToMaxPercentage}
              />

              <MultipliersCard
                eventConfig={eventConfig}
                highlightedRuleIds={highlightedRuleIds}
                t={t}
              />

              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t("events.killDetail.matchingLoots")}
                </h3>

                {isLootsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : loots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <Frown className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">{t("events.killDetail.noLoots")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loots.map((loot) => (
                      <LootsListItem key={loot.id} loot={loot} />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
