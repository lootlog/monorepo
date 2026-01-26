import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useEvent } from "./hooks/queries/use-event";
import type { EventHeroNpc } from "./hooks/queries/use-events";
import { EventRankingPreview } from "./components/ranking/event-ranking-preview";
import {
  Trophy,
  AlertCircle,
  Swords,
  Pencil,
  Plus,
  Clock,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { EventEditDialog } from "./components/dialogs/event-edit-dialog";
import { HeroManageDialog } from "./components/dialogs/hero-manage-dialog";
import { MapManageDialog } from "./components/dialogs/map-manage-dialog";
import { useEventMutations } from "./hooks/mutations/use-event-mutations";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { toast } from "sonner";
import { Permission } from "@lootlog/types";
import { useEventHeroTimers } from "./hooks/queries/use-event-hero-timers";
import { useEventHeroStats } from "./hooks/queries/use-event-hero-stats";
import { EventHeroLoots } from "./components/stats/event-hero-loots";
import { RecentKillsPreview } from "./components/kills/recent-kills-preview";
import { HeroCard } from "./components/heroes/hero-card";

export const EventDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId } = useParams({ strict: false });

  const {
    data: event,
    isLoading,
    error,
  } = useEvent({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  const { data: permissions } = useGuildPermissions();

  const { data: heroTimers } = useEventHeroTimers({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    world: event?.world ?? "",
  });

  const { data: heroStats } = useEventHeroStats({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });
  const { deleteHero, updateEvent } = useEventMutations(
    guildId ?? "",
    eventId ?? "",
  );

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [heroDialogOpen, setHeroDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedHero, setSelectedHero] = useState<EventHeroNpc | null>(null);

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  const handleEditHero = (hero: EventHeroNpc) => {
    setSelectedHero(hero);
    setHeroDialogOpen(true);
  };

  const handleManageMaps = (hero: EventHeroNpc) => {
    setSelectedHero(hero);
    setMapDialogOpen(true);
  };

  const handleDeleteHero = async (heroId: string) => {
    try {
      await deleteHero.mutateAsync(heroId);
      toast.success(t("events.heroes.deleted"));
    } catch (_) {
      toast.error(t("events.heroes.deleteError"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t("events.error")}</p>
        <Link to="/$guildId/events" params={{ guildId: guildId ?? "" }}>
          <Button variant="outline">{t("events.backToList")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      {event && (
        <>
          <EventEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            event={event}
          />
          <HeroManageDialog
            open={heroDialogOpen}
            onOpenChange={setHeroDialogOpen}
            guildId={guildId ?? ""}
            eventId={eventId ?? ""}
            hero={selectedHero}
          />
          {selectedHero && (
            <MapManageDialog
              open={mapDialogOpen}
              onOpenChange={setMapDialogOpen}
              guildId={guildId ?? ""}
              eventId={eventId ?? ""}
              hero={selectedHero}
            />
          )}
        </>
      )}

      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-tight">
              {event.name}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant={event.active ? "default" : "secondary"}
                className="text-xs"
              >
                {event.active ? t("events.active") : t("events.inactive")}
              </Badge>

              <Badge variant="outline" className="text-xs">
                {event.world.charAt(0).toUpperCase() + event.world.slice(1)}
              </Badge>

              <Badge variant="outline" className="text-xs gap-1">
                <CalendarDays className="w-3 h-3" />
                {format(
                  new Date(event.startsAt || event.createdAt),
                  "d MMM yyyy",
                  { locale: pl },
                )}
                {" – "}
                {event.endsAt
                  ? format(new Date(event.endsAt), "d MMM yyyy", { locale: pl })
                  : t("events.ongoing")}
              </Badge>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 cursor-help"
                  >
                    <Clock className="w-3 h-3" />
                    {event.assignmentTimeoutMinutes ?? 5} min
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {t(
                      "events.header.assignmentTimeoutTooltip",
                      "Czas przed respawnem, kiedy można się przypisać do mapy",
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>

              {(() => {
                const hasTimeMultipliers =
                  event.timeOfDayMultipliers &&
                  event.timeOfDayMultipliers.length > 0;
                const hasTrackersMultipliers =
                  event.trackersMultipliers &&
                  Object.keys(event.trackersMultipliers).length > 0;
                const hasMapsMultipliers =
                  event.mapsCountMultipliers &&
                  Object.keys(event.mapsCountMultipliers).length > 0;

                const multiplierCount =
                  (hasTimeMultipliers ? 1 : 0) +
                  (hasTrackersMultipliers ? 1 : 0) +
                  (hasMapsMultipliers ? 1 : 0);

                if (multiplierCount === 0) return null;

                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-xs gap-1 cursor-help"
                      >
                        <TrendingUp className="w-3 h-3" />
                        {t("events.header.multipliers", {
                          count: multiplierCount,
                          defaultValue:
                            multiplierCount === 1
                              ? "{{count}} mnożnik"
                              : "{{count}} mnożniki",
                        })}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1.5 text-xs">
                        {hasTimeMultipliers && (
                          <div>
                            <p className="font-medium">
                              {t(
                                "events.header.timeMultipliers",
                                "Mnożniki czasowe",
                              )}
                              :
                            </p>
                            {event.timeOfDayMultipliers?.map((m, idx) => (
                              <p key={idx} className="text-muted-foreground">
                                {m.from} - {m.to}: x{m.multiplier}
                              </p>
                            ))}
                          </div>
                        )}
                        {hasTrackersMultipliers && (
                          <div>
                            <p className="font-medium">
                              {t(
                                "events.header.trackersMultipliers",
                                "Mnożniki za obecność",
                              )}
                              :
                            </p>
                            {Object.entries(event.trackersMultipliers ?? {})
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([count, multiplier]) => (
                                <p
                                  key={count}
                                  className="text-muted-foreground"
                                >
                                  {`${count}+ ${t("events.header.people")}: x${multiplier}`}
                                </p>
                              ))}
                          </div>
                        )}
                        {hasMapsMultipliers && (
                          <div>
                            <p className="font-medium">
                              {t(
                                "events.header.mapsMultipliers",
                                "Mnożniki za mapy",
                              )}
                              :
                            </p>
                            {Object.entries(event.mapsCountMultipliers ?? {})
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([count, multiplier]) => (
                                <p
                                  key={count}
                                  className="text-muted-foreground"
                                >
                                  {`${count} ${t("events.header.mapsLabel")}: x${multiplier}`}
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              {t("events.editButton")}
            </Button>
          )}
          {canManage &&
            (event.active ? (
              <ConfirmDeleteDialog
                title={t("events.endDialog.title")}
                description={t("events.endDialog.description")}
                onConfirm={async () => {
                  try {
                    await updateEvent.mutateAsync({
                      active: false,
                    });
                    toast.success(t("events.endSuccess"));
                  } catch (_) {
                    toast.error(t("events.statusError"));
                  }
                }}
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={updateEvent.isPending}
                  >
                    {t("events.end")}
                  </Button>
                }
              />
            ) : (
              <Button
                variant="default"
                size="sm"
                disabled={updateEvent.isPending}
                onClick={async () => {
                  try {
                    await updateEvent.mutateAsync({
                      active: true,
                    });
                    toast.success(t("events.resumeSuccess"));
                  } catch (_) {
                    toast.error(t("events.statusError"));
                  }
                }}
              >
                {t("events.resume")}
              </Button>
            ))}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2 h-fit">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Swords className="w-4 h-4 text-yellow-500" />
                    {t("events.heroes.title")}
                  </h2>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHero(null);
                        setHeroDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("events.heroes.addButton")}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {event.heroNpcs?.map((hero) => (
                    <HeroCard
                      key={hero.id}
                      hero={hero}
                      timer={heroTimers?.find(
                        (t) => hero.npcId !== null && t.npcId === hero.npcId,
                      )}
                      stats={heroStats?.find(
                        (s) => hero.npcId !== null && s.npcId === hero.npcId,
                      )}
                      guildId={guildId ?? ""}
                      eventId={eventId ?? ""}
                      canManage={canManage ?? false}
                      onEditHero={handleEditHero}
                      onManageMaps={handleManageMaps}
                      onDeleteHero={handleDeleteHero}
                      t={t}
                    />
                  ))}
                  {(!event.heroNpcs || event.heroNpcs.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                      <Swords className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">{t("events.heroes.empty")}</p>
                    </div>
                  )}
                </div>
              </Card>

              <EventHeroLoots
                guildId={guildId ?? ""}
                heroNpcNames={event.heroNpcs?.map((h) => h.npcName) ?? []}
                heroNpcs={event.heroNpcs}
                showHeroTabs
                world={event.world}
                limit={5}
              />
            </div>

            <div className="space-y-4">
              <EventRankingPreview
                rankings={event.rankings || []}
                heroNpcs={event.heroNpcs || []}
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                limit={5}
              />

              <RecentKillsPreview
                guildId={guildId ?? ""}
                eventId={eventId ?? ""}
                heroNpcs={event.heroNpcs}
                showHeroTabs
                limit={5}
                showHeroName
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
