import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Badge } from "@lootlog/ui/components/badge";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@lootlog/ui/components/avatar";
import {
  Skull,
  AlertCircle,
  ChevronLeft,
  Clock,
  Users,
  Target,
  Package,
  Frown,
  Calendar,
  MapPin,
  Calculator,
  User,
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { pl } from "date-fns/locale";
import { useKillDetail, type KillDetailParticipant, type MatchingLoot, type EventConfig } from "./hooks/use-kill-detail";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "@/utils/cn";
import { MARGONEM_CDN_ITEMS_URL, MARGONEM_CDN_CHARACTERS_URL, MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { ItemRarity } from "@/hooks/api/loots/use-loots";

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const formatRespawnWindow = (minSpawn: string, maxSpawn: string): string => {
  const minDate = new Date(minSpawn);
  const maxDate = new Date(maxSpawn);
  const diffSeconds = differenceInSeconds(maxDate, minDate);

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

interface ParticipantRowProps {
  participant: KillDetailParticipant;
  t: ReturnType<typeof useTranslation>["t"];
}

const ParticipantRow = ({ participant, t }: ParticipantRowProps) => {
  const avatarUrl = getDiscordAvatarUrl(
    participant.member.userId,
    participant.member.avatar,
    32,
  );
  const roleColor = participant.member.roles?.[0]?.color;
  const nameStyle = roleColor ? { color: `#${roleColor.toString(16).padStart(6, "0")}` } : undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-colors",
        participant.wasPresent ? "bg-muted/30" : "bg-muted/10 opacity-60",
      )}
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-sm">
          {participant.member.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={nameStyle}>
          {participant.member.name}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {participant.mapName}
        </p>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(participant.timeOnMapSeconds)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("events.kills.timeOnMap")}</p>
          </TooltipContent>
        </Tooltip>

        {participant.afkPercentage > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-amber-500">
                {Math.round(participant.afkPercentage)}% AFK
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("events.kills.afkPercentage")}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-primary">{participant.points}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground cursor-help">
              {participant.basePoints} x {participant.appliedMultiplier.toFixed(2)}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {t("events.kills.pointsBreakdown", {
                base: participant.basePoints,
                multiplier: participant.appliedMultiplier.toFixed(2),
              })}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

interface MultipliersCardProps {
  eventConfig: EventConfig;
  t: ReturnType<typeof useTranslation>["t"];
}

const MultipliersCard = ({ eventConfig, t }: MultipliersCardProps) => {
  const hasTimeMultipliers = eventConfig.timeOfDayMultipliers && eventConfig.timeOfDayMultipliers.length > 0;
  const hasTrackersMultipliers = eventConfig.trackersMultipliers && Object.keys(eventConfig.trackersMultipliers).length > 0;
  const hasMapsMultipliers = eventConfig.mapsCountMultipliers && Object.keys(eventConfig.mapsCountMultipliers).length > 0;

  if (!hasTimeMultipliers && !hasTrackersMultipliers && !hasMapsMultipliers) {
    return null;
  }

  return (
    <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5" />
        {t("events.killDetail.multipliers.title")}
      </h3>

      <div className="space-y-4">
        <div className="text-sm">
          <span className="text-muted-foreground">{t("events.killDetail.multipliers.basePoints")}:</span>{" "}
          <span className="font-medium">{eventConfig.basePointsPerKill}</span>
        </div>

        {hasTimeMultipliers && (
          <div>
            <h4 className="text-sm font-medium mb-2">{t("events.killDetail.multipliers.timeOfDay")}</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {eventConfig.timeOfDayMultipliers!.map((m, idx) => (
                <div key={idx} className="px-3 py-2 rounded bg-muted/30 text-sm">
                  <span className="text-muted-foreground">{m.from} - {m.to}</span>
                  <span className="ml-2 font-medium text-primary">x{m.multiplier}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasTrackersMultipliers && (
          <div>
            <h4 className="text-sm font-medium mb-2">{t("events.killDetail.multipliers.trackers")}</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(eventConfig.trackersMultipliers!).map(([count, multiplier]) => (
                <div key={count} className="px-3 py-2 rounded bg-muted/30 text-sm text-center">
                  <span className="text-muted-foreground">{count}+</span>
                  <span className="ml-1 font-medium text-primary">x{multiplier}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasMapsMultipliers && (
          <div>
            <h4 className="text-sm font-medium mb-2">{t("events.killDetail.multipliers.maps")}</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(eventConfig.mapsCountMultipliers!).map(([count, multiplier]) => (
                <div key={count} className="px-3 py-2 rounded bg-muted/30 text-sm text-center">
                  <span className="text-muted-foreground">{count}</span>
                  <span className="ml-1 font-medium text-primary">x{multiplier}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

interface LootCardProps {
  loot: MatchingLoot;
}

const LEGENDARY_GRADIENT =
  "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0) 50%, rgba(239,68,68,0.05) 100%)";

const LootCard = ({ loot }: LootCardProps) => {
  const date = timestampToDate(loot.createdAt);
  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === ItemRarity.LEGENDARY,
  );

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-card/30",
        hasLegendaryItem &&
          "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
      )}
      style={hasLegendaryItem ? { background: LEGENDARY_GRADIENT } : undefined}
    >
      {/* Header - NPCs */}
      <div className="flex items-center gap-2 mb-2">
        {loot.npcs.slice(0, 3).map((npc) => (
          <div key={npc.id} className="flex items-center gap-1.5">
            {npc.icon && (
              <img
                src={`${MARGONEM_CDN_NPCS_URL}/${npc.icon}`}
                alt={npc.name}
                className="w-6 h-6 object-contain"
              />
            )}
            <span className="text-sm font-medium">{npc.name}</span>
          </div>
        ))}
        {loot.npcs.length > 3 && (
          <span className="text-xs text-muted-foreground">
            +{loot.npcs.length - 3}
          </span>
        )}
      </div>

      {/* Players */}
      <div className="flex flex-row items-start gap-2 flex-wrap py-2 border-t border-border/30">
        {loot.players.slice(0, 6).map((player) => (
          <div key={player.id} className="flex items-center gap-1">
            {player.icon && (
              <img
                src={`${MARGONEM_CDN_CHARACTERS_URL}/${player.icon}`}
                alt={player.name}
                className="w-5 h-8 object-contain"
              />
            )}
            <span className="text-xs">{player.name}</span>
          </div>
        ))}
        {loot.players.length > 6 && (
          <span className="text-xs text-muted-foreground self-center">
            +{loot.players.length - 6}
          </span>
        )}
      </div>

      {/* Items */}
      {loot.items.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1 py-2 border-t border-border/30">
          {loot.items.slice(0, 8).map((item, idx) => (
            <Tooltip key={`${item.hid}-${idx}`}>
              <TooltipTrigger asChild>
                <img
                  src={`${MARGONEM_CDN_ITEMS_URL}/${item.icon}`}
                  alt={item.name}
                  className={cn(
                    "w-8 h-8 object-contain cursor-pointer",
                    item.rarity === ItemRarity.LEGENDARY && "ring-1 ring-red-500 rounded",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{item.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {loot.items.length > 8 && (
            <span className="text-xs text-muted-foreground self-center">
              +{loot.items.length - 8}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {loot.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {date}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {loot.players.length}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {loot.items.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export const KillDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId, killId } = useParams({ strict: false });

  const { data, isLoading, error } = useKillDetail({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    heroId: heroId ?? "",
    killId: killId ?? "",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
          params={{ guildId: guildId ?? "", eventId: eventId ?? "", heroId: heroId ?? "" }}
        >
          <Button variant="outline">{t("events.common.backToHero")}</Button>
        </Link>
      </div>
    );
  }

  const { kill, loots, eventConfig } = data;
  const participants = kill.points ?? [];
  const totalPoints = participants.reduce((sum, p) => sum + p.points, 0);
  const respawnWindow = formatRespawnWindow(kill.minSpawnTimeAtKill, kill.maxSpawnTimeAtKill);

  const sortedParticipants = [...participants].sort((a, b) => b.points - a.points);

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
          <Link
            to="/$guildId/events/$eventId/heroes/$heroId"
            params={{
              guildId: guildId ?? "",
              eventId: eventId ?? "",
              heroId: heroId ?? "",
            }}
            className="mr-3"
          >
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Skull className="size-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                {kill.heroNpc.npcName}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {format(new Date(kill.killedAt), "d MMMM yyyy, HH:mm:ss", { locale: pl })}
              </p>
            </div>
          </div>

          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {respawnWindow}
          </Badge>
        </div>

        <div className="px-3 pb-6 flex flex-col gap-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPoints}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("events.killDetail.totalPoints")}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{participants.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("events.killDetail.participantCount")}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loots.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("events.killDetail.lootCount")}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Kill Detection Info */}
          {kill.timerCreatedBy && (
            <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t("events.killDetail.detectedBy")}
              </h3>
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage
                    src={getDiscordAvatarUrl(
                      kill.timerCreatedBy.userId,
                      kill.timerCreatedBy.avatar,
                      32,
                    )}
                  />
                  <AvatarFallback className="text-xs">
                    {kill.timerCreatedBy.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{kill.timerCreatedBy.name}</span>
              </div>
            </Card>
          )}

          {/* Participants */}
          <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("events.killDetail.participants")}
            </h3>

            {sortedParticipants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Frown className="w-8 h-8 mb-2" />
                <p className="text-sm">{t("events.kills.noParticipants")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedParticipants.map((participant) => (
                  <ParticipantRow
                    key={participant.id}
                    participant={participant}
                    t={t}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Multipliers */}
          <MultipliersCard eventConfig={eventConfig} t={t} />

          {/* Matching Loots */}
          <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t("events.killDetail.matchingLoots")}
            </h3>

            {loots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Frown className="w-8 h-8 mb-2" />
                <p className="text-sm">{t("events.killDetail.noLoots")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loots.map((loot) => (
                  <LootCard key={loot.id} loot={loot} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
};
