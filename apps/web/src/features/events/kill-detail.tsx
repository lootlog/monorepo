import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Badge } from "@lootlog/ui/components/badge";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Skull,
  AlertCircle,
  ChevronLeft,
  Clock,
  Users,
  Target,
  Package,
  Frown,
  User,
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { pl } from "date-fns/locale";
import { useKillDetail } from "./hooks/queries/use-kill-detail";
import { useHeroCoverageGaps } from "./hooks/queries/use-map-coverage-timer";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { ParticipantRow } from "./components/participant-row";
import { MultipliersCard } from "./components/multipliers-card";
import { KillLootCard } from "./components/kill-loot-card";
import { CoverageGapsCard } from "./components/coverage-gaps-card";

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

export const KillDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId, killId } = useParams({ strict: false });

  const { data, isLoading, error } = useKillDetail({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    heroId: heroId ?? "",
    killId: killId ?? "",
  });

  const { data: coverageGaps } = useHeroCoverageGaps(eventId ?? "", heroId ?? "");

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
        <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-3">
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

        <div className="px-3 pb-4 flex flex-col gap-4">
          {/* Stats Cards */}
          <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">{totalPoints}</p>
                  <p className="text-xs text-muted-foreground">{t("events.killDetail.totalPoints")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-green-500/10">
                  <Users className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{participants.length}</p>
                  <p className="text-xs text-muted-foreground">{t("events.killDetail.participantCount")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-500/10">
                  <Package className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{loots.length}</p>
                  <p className="text-xs text-muted-foreground">{t("events.killDetail.lootCount")}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Kill Detection Info */}
          {kill.timerCreatedBy && (
            <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
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
          <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("events.killDetail.participants")}
            </h3>

            {sortedParticipants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Frown className="w-8 h-8 mb-2 opacity-50" />
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

          {/* Coverage Gaps */}
          {coverageGaps && coverageGaps.length > 0 && (
            <CoverageGapsCard gaps={coverageGaps} t={t} />
          )}

          {/* Matching Loots */}
          <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              {t("events.killDetail.matchingLoots")}
            </h3>

            {loots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Frown className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">{t("events.killDetail.noLoots")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loots.map((loot) => (
                  <KillLootCard key={loot.id} loot={loot} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
};
