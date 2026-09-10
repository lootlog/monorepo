import { SectionCard } from "@/components/common/section-card/section-card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { AlertCircle, Eraser, MapPin, Plus, Users } from "lucide-react";
import { CloseRespawnWindowDialog } from "./components/dialogs/close-respawn-window-dialog";
import { EventParticipationConfirmationDialog } from "./components/dialogs/event-participation-confirmation-dialog";
import { MapManageDialog } from "./components/dialogs/map-manage-dialog";
import { MemberAssignmentModal } from "./components/dialogs/member-assignment-modal";
import { OpenRespawnWindowDialog } from "./components/dialogs/open-respawn-window-dialog";
import { HeroDetailResponsiveLayout } from "./components/heroes/hero-detail-responsive-layout";
import { RecentKillsPreview } from "./components/kills/recent-kills-preview";
import { EventMapGrid } from "./components/maps/event-map-grid";
import { EventRankingPreview } from "./components/ranking/event-ranking-preview";
import { MemberBadge } from "./components/shared/member-badge";
import { EventHeroLoots } from "./components/stats/event-hero-loots";
import { HeroDetailHeader } from "./hero-detail-header";

const getMapCoverageCountClassName = (
  canShowCoverageCount: boolean,
  coveredMapsCount: number,
  totalMapsCount: number,
) => {
  if (!canShowCoverageCount) return "text-muted-foreground";
  if (coveredMapsCount === totalMapsCount) return "text-green-500";
  if (coveredMapsCount > 0) return "text-yellow-500";
  return "text-destructive";
};

const getMapCoverageLabel = (
  canShowCoverageCount: boolean,
  coveredMapsCount: number,
  totalMapsCount: number,
) =>
  canShowCoverageCount
    ? `(${coveredMapsCount}/${totalMapsCount})`
    : `(${totalMapsCount})`;

import { useHeroDetail } from "./use-hero-detail";

export const HeroDetail = () => {
  const model = useHeroDetail();
  if (model.status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (model.status === "missing") {
    const { t, queryGuildId, queryEventId } = model;
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 max-h-full overflow-y-auto [justify-content:safe_center]">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t("events.heroes.notFound")}</p>
        <Link
          to="/$guildId/events/$eventId"
          params={{ guildId: queryGuildId, eventId: queryEventId }}
        >
          <Button variant="outline">{t("events.common.backToEvent")}</Button>
        </Link>
      </div>
    );
  }
  const {
    hero,
    event,
    heroTimer,
    windowStatus,
    t,
    canManage,
    respawnAction,
    handleRespawnActionClick,
    RespawnActionIcon,
    guildId,
    eventId,
    canShowCoverageCount,
    coveredMapsCount,
    totalMapsCount,
    handleClearAllAssignments,
    isClearingAssignments,
    uniqueMembers,
    pendingAssignmentCount,
    setMapManageOpen,
    handleSelfAssignClick,
    handleSelfUnassignClick,
    handleManageClick,
    currentMember,
    presenceData,
    assignmentAllowed,
    assignmentEnabledAt,
    assignmentDisabledMessage,
    activeGapsMap,
    queryGuildId,
    queryEventId,
    rankings,
    queryHeroId,
    mapManageOpen,
    selectedMap,
    assignmentOpen,
    setAssignmentOpen,
    handleAssignFromModal,
    handleUnassignFromModal,
    closeWindowOpen,
    setCloseWindowOpen,
    handleCloseRespawnWindow,
    closeRespawnWindow,
    openWindowOpen,
    setOpenWindowOpen,
    handleOpenRespawnWindow,
    openRespawnWindow,
  } = model;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <EventParticipationConfirmationDialog
        guildId={guildId}
        eventId={eventId}
      />

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-3">
          <HeroDetailHeader
            hero={hero}
            event={event}
            heroTimer={heroTimer}
            windowStatus={windowStatus}
            t={t}
            canManage={canManage}
            respawnAction={respawnAction}
            handleRespawnActionClick={handleRespawnActionClick}
            RespawnActionIcon={RespawnActionIcon}
          />

          <HeroDetailResponsiveLayout
            maps={
              <SectionCard className="@container/maps gap-0 overflow-hidden border-border bg-card p-0">
                <SectionCardHeader
                  icon={MapPin}
                  title={
                    <>
                      <span className="truncate">{t("events.maps.title")}</span>
                      <span
                        className={cn(
                          "shrink-0 font-normal",
                          getMapCoverageCountClassName(
                            canShowCoverageCount,
                            coveredMapsCount,
                            totalMapsCount,
                          ),
                        )}
                      >
                        {getMapCoverageLabel(
                          canShowCoverageCount,
                          coveredMapsCount,
                          totalMapsCount,
                        )}
                      </span>
                    </>
                  }
                  actions={
                    <>
                      {canManage && (
                        <div className="ml-auto flex shrink-0 items-center gap-1.5">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="inline-flex">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="size-9 px-0 @2xl/maps:w-auto @2xl/maps:px-3"
                                    onClick={handleClearAllAssignments}
                                    loading={isClearingAssignments}
                                    icon=<Eraser className="size-4" />
                                    disabled={
                                      uniqueMembers.length === 0 ||
                                      pendingAssignmentCount > 0
                                    }
                                    aria-label={t("events.maps.clearAll")}
                                  >
                                    <span className="hidden @2xl/maps:inline">
                                      {t("events.maps.clearAll")}
                                    </span>
                                  </Button>
                                </span>
                              }
                            />
                            <TooltipContent>
                              {t("events.maps.clearAll")}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="size-9 px-0 @2xl/maps:w-auto @2xl/maps:px-3"
                                  onClick={() => setMapManageOpen(true)}
                                  aria-label={t("events.maps.manage")}
                                >
                                  <Plus className="size-4" />
                                  <span className="hidden @2xl/maps:inline">
                                    {t("events.maps.manage")}
                                  </span>
                                </Button>
                              }
                            />
                            <TooltipContent>
                              {t("events.maps.manage")}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </>
                  }
                />
                <EventMapGrid
                  locations={hero.locations}
                  maps={hero.maps}
                  actionsDisabled={isClearingAssignments}
                  onSelfAssignClick={handleSelfAssignClick}
                  onSelfUnassignClick={handleSelfUnassignClick}
                  onManageClick={handleManageClick}
                  currentMemberId={currentMember?.id}
                  presenceData={presenceData}
                  assignmentDisabled={!assignmentAllowed}
                  assignmentEnabledAt={assignmentEnabledAt}
                  assignmentDisabledMessage={assignmentDisabledMessage}
                  windowStatus={windowStatus}
                  activeGapsMap={activeGapsMap}
                  vertical
                />
              </SectionCard>
            }
            participants={
              uniqueMembers.length > 0 ? (
                <SectionCard className="@container/participants gap-0 overflow-hidden border-border bg-card p-0">
                  <SectionCardHeader
                    icon={Users}
                    title={<> {t("events.participants.title")} </>}
                    actions={
                      <>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          ({uniqueMembers.length})
                        </span>
                      </>
                    }
                  />
                  <div className="-mb-px -mr-px grid grid-cols-1 bg-card @sm/participants:grid-cols-2 @lg/participants:grid-cols-3 @2xl/participants:grid-cols-4">
                    {uniqueMembers.map((member) => (
                      <MemberBadge
                        key={member.id}
                        member={member}
                        guildId={queryGuildId}
                        eventId={queryEventId}
                      />
                    ))}
                  </div>
                </SectionCard>
              ) : null
            }
            sidebar={
              <>
                <EventRankingPreview
                  rankings={rankings.filter(
                    (r) => r.heroNpcName === hero.npcName,
                  )}
                  heroNpcs={[hero]}
                  guildId={queryGuildId}
                  eventId={queryEventId}
                  limit={5}
                />

                <RecentKillsPreview
                  guildId={queryGuildId}
                  eventId={queryEventId}
                  heroId={queryHeroId}
                  limit={5}
                />

                <EventHeroLoots
                  guildId={queryGuildId}
                  heroNpcNames={[hero.npcName]}
                  world={event.world}
                  limit={3}
                />
              </>
            }
          />
        </div>
      </ScrollArea>
      <MapManageDialog
        open={mapManageOpen}
        onOpenChange={setMapManageOpen}
        guildId={queryGuildId}
        eventId={queryEventId}
        hero={hero}
      />
      {selectedMap && (
        <MemberAssignmentModal
          open={assignmentOpen}
          onOpenChange={setAssignmentOpen}
          mapName={selectedMap.mapName}
          assignedMembers={selectedMap.assignedMembers ?? []}
          onAssign={handleAssignFromModal}
          onUnassign={handleUnassignFromModal}
          disabled={!assignmentAllowed}
          disabledMessage={assignmentDisabledMessage}
        />
      )}
      <CloseRespawnWindowDialog
        open={closeWindowOpen}
        onOpenChange={setCloseWindowOpen}
        heroName={hero.npcName}
        onConfirm={handleCloseRespawnWindow}
        isLoading={closeRespawnWindow.isPending}
      />
      <OpenRespawnWindowDialog
        open={openWindowOpen}
        onOpenChange={setOpenWindowOpen}
        heroName={hero.npcName}
        onConfirm={handleOpenRespawnWindow}
        isLoading={openRespawnWindow.isPending}
      />
    </div>
  );
};
