import { Card } from "@lootlog/ui/components/card";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
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
  Activity,
} from "lucide-react";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { PlayerTile } from "@/components/tiles/player-tile";
import type { ActivityLog } from "@/hooks/api/activity-logs/use-activity-logs";

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

export const ActivityLogItem: React.FC<Props> = ({ activity }) => {
  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];
  const sourceConfig = SOURCE_CONFIG[activity.source];
  const TypeIcon = typeConfig.icon;
  const SourceIcon = sourceConfig.icon;

  const timeAgo = getRelativeTime(activity.createdAt);

  const hasActorSnapshot = activity.actorSnapshot && activity.actorSnapshot.icon;
  const hasAdditionalData =
    activity.lootContext ||
    activity.timerContext ||
    (activity.details && Object.keys(activity.details).length > 0);

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
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
            <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              <Calendar className="h-3 w-3" />
              {timeAgo}
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
                className="scale-100"
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  {activity.actorSnapshot?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {activity.actorSnapshot?.lvl}
                  {activity.actorSnapshot?.prof?.[0]?.toLowerCase()} • {activity.actorSnapshot?.clanName}
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

          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>ID: {activity.id.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3 w-3" />
              <span>User: {activity.userId.slice(0, 8)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>Guild: {activity.guildId.slice(0, 8)}</span>
            </div>
            {activity.discordId && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Monitor className="h-3 w-3" />
                <span>Discord: {activity.discordId}</span>
              </div>
            )}
          </div>

          {hasAdditionalData && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-2 hover:no-underline">
                  Szczegóły aktywności
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {activity.lootContext && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-green-500" />
                          <span className="font-semibold text-sm">Kontekst Loot</span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>ID: <span className="font-mono">{activity.lootContext.id}</span></div>
                          <div>Loot ID: <span className="font-mono">{activity.lootContext.lootId}</span></div>
                        </div>
                      </div>
                    )}

                    {activity.timerContext && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-sm">Kontekst Timer</span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>ID: <span className="font-mono">{activity.timerContext.id}</span></div>
                          <div>NPC: <span className="font-medium">{activity.timerContext.npcName}</span></div>
                        </div>
                      </div>
                    )}

                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="font-semibold text-sm mb-2">Dodatkowe dane</div>
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
