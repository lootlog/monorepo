import { Card } from "@lootlog/ui/components/card";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@lootlog/ui/components/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  Package,
  Clock,
  LogIn,
  LogOut,
  Calendar,
  User,
  Monitor,
  Gamepad2,
  Hash,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { PlayerTile } from "@/features/guild/components/loots-list/player-tile";
import type { ActivityLog } from "@/hooks/api/activity-logs/use-activity-logs";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useState } from "react";
import { useGuildMembers } from "@/hooks/api/members/use-guild-members";
import { MARGONEM_GUILD_URL } from "@/constants/margonem";

type Props = {
  activity: ActivityLog;
};

const ACTIVITY_TYPE_CONFIG = {
  LOOT_EVENT: {
    icon: Package,
    label: "Loot",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  TIMER_EVENT: {
    icon: Clock,
    label: "Timer",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  CONNECT_EVENT: {
    icon: LogIn,
    label: "Połączenie",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  DISCONNECT_EVENT: {
    icon: LogOut,
    label: "Rozłączenie",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

const SOURCE_CONFIG = {
  GAME: {
    icon: Gamepad2,
    label: "Gra",
  },
  WEB_APP: {
    icon: Monitor,
    label: "Web",
  },
};

export const ActivityLogsListItem: React.FC<Props> = ({ activity }) => {
  const [isOpen, setIsOpen] = useState("");
  const { data: members } = useGuildMembers(true);

  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];
  const sourceConfig = SOURCE_CONFIG[activity.source];
  const TypeIcon = typeConfig.icon;
  const SourceIcon = sourceConfig.icon;

  const formattedDate = format(
    new Date(activity.createdAt),
    "yyyy-MM-dd HH:mm:ss",
    {
      locale: pl,
    },
  );

  const hasActorSnapshot =
    activity.actorSnapshot && activity.actorSnapshot.icon;
  const hasAdditionalData =
    activity.lootContext ||
    activity.timerContext ||
    (activity.details && Object.keys(activity.details).length > 0);

  const discordMember = activity.discordId
    ? members?.find((m) => m.userId === activity.discordId)
    : undefined;

  const handleCardClick = () => {
    if (hasAdditionalData) {
      setIsOpen(isOpen === "details" ? "" : "details");
    }
  };

  return (
    <Card
      className={`p-4 transition-all duration-300 border bg-background/30 backdrop-blur-md ${
        hasAdditionalData
          ? "cursor-pointer border-border hover:bg-card/50 hover:border-primary/50"
          : "border-border"
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
          <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{typeConfig.label}</span>
              <Badge variant="outline" className="text-xs">
                <SourceIcon className="h-3 w-3 mr-1" />
                {sourceConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </div>
              {hasAdditionalData && (
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isOpen === "details" ? "rotate-180" : ""
                  }`}
                />
              )}
            </div>
          </div>

          {hasActorSnapshot && (
            <div className="flex items-center gap-3 mb-3">
              <PlayerTile
                player={{
                  id: activity.actorSnapshot?.id,
                  name: activity.actorSnapshot?.name,
                  lvl: activity.actorSnapshot?.lvl,
                  prof: activity.actorSnapshot?.prof,
                  icon: activity.actorSnapshot?.icon,
                }}
                className="scale-80 top-1"
                accountId={activity.actorSnapshot?.accountId}
                characterId={activity.actorSnapshot?.characterId}
                world={activity.world}
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  {activity.actorSnapshot?.name}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {activity.actorSnapshot?.lvl}
                  {activity.actorSnapshot?.prof?.[0]?.toLowerCase()}
                  {activity.actorSnapshot?.clanName && activity.world && (
                    <>
                      &nbsp;•
                      {activity.actorSnapshot.clanId ? (
                        <a
                          href={`${MARGONEM_GUILD_URL},${activity.world},${activity.actorSnapshot.clanId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline transition-colors text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {activity.actorSnapshot.clanName}
                        </a>
                      ) : (
                        <span>{activity.actorSnapshot.clanName}</span>
                      )}
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {!hasActorSnapshot && activity.actorSnapshot && (
            <div className="flex items-center gap-2 text-sm mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {activity.actorSnapshot.name}({activity.actorSnapshot.lvl}
                {activity.actorSnapshot.prof?.[0]?.toLowerCase() ?? ""})
              </span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>ID: {activity.id}</span>
            </div>

            {activity.discordId && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Monitor className="h-3 w-3" />
                <span>
                  Discord:{" "}
                  {discordMember ? (
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <span
                            className="font-medium text-foreground hover:underline cursor-help"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {discordMember.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover/95 backdrop-blur-md border-border/50">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {discordMember.isStale ? (
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                              <span className="font-medium">
                                {discordMember.isStale
                                  ? "Dane nieaktualne"
                                  : "Dane aktualne"}
                              </span>
                            </div>
                            {discordMember.staleWarning && (
                              <span className="text-muted-foreground">
                                {discordMember.staleWarning}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Zaktualizowano:{" "}
                              {format(
                                new Date(discordMember.updatedAt),
                                "yyyy-MM-dd HH:mm:ss",
                              )}
                            </span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    activity.discordId
                  )}
                </span>
              </div>
            )}
            {activity.world && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  Świat:{" "}
                  {activity.world.charAt(0).toUpperCase() +
                    activity.world.slice(1)}
                </span>
              </div>
            )}
          </div>

          {hasAdditionalData && (
            <Accordion
              type="single"
              collapsible
              className="w-full"
              value={isOpen}
              onValueChange={setIsOpen}
            >
              <AccordionItem value="details" className="border-none">
                <AccordionContent>
                  <div className="space-y-3 pt-2 border-t border-border/30 mt-2">
                    {activity.lootContext && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-green-500" />
                          <span className="font-semibold text-sm">
                            Kontekst Loot
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>
                            ID:{" "}
                            <span className="font-mono">
                              {activity.lootContext.id}
                            </span>
                          </div>
                          <div>
                            Loot ID:{" "}
                            <span className="font-mono">
                              {activity.lootContext.lootId}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activity.timerContext && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-sm">
                            Kontekst Timer
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>
                            ID:{" "}
                            <span className="font-mono">
                              {activity.timerContext.id}
                            </span>
                          </div>
                          <div>
                            NPC:{" "}
                            <span className="font-medium">
                              {activity.timerContext.npcName}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activity.details &&
                      Object.keys(activity.details).length > 0 && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="font-semibold text-sm mb-2">
                            Dodatkowe dane
                          </div>
                          <pre className="text-xs overflow-x-auto">
                            {JSON.stringify(activity.details, null, 2)}
                          </pre>
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </div>
    </Card>
  );
};
