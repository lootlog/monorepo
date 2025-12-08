import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { UserPlus, User, MapPin, X } from "lucide-react";
import type { EventMap } from "../hooks/use-events";
import { cn } from "@lootlog/ui/lib/utils";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { Permission } from "@lootlog/types";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";

import { useMemberColor } from "@/hooks/discord/use-member-color";

const MemberName = ({ member }: { member: any }) => {
  const color = useMemberColor(member);
  return (
    <span className="text-sm text-muted-foreground truncate" style={{ color }}>
      {member.name}
    </span>
  );
};

type MapStatus = "ASSIGNED_PRESENT" | "ASSIGNED_ABSENT" | "UNASSIGNED";

interface EventMapGridProps {
  maps: EventMap[];
  guildId: string;
  eventId: string;
  heroId: string;
  onAssignClick?: (mapId: string) => void;
  onUnassignClick?: (mapId: string) => void;
  currentMemberId?: number;
}

const getMapStatus = (map: EventMap): MapStatus => {
  if (!map.assignedMembers || map.assignedMembers.length === 0)
    return "UNASSIGNED";
  // For now, we assume assigned members are present
  // This would need real-time presence data from WebSocket
  return "ASSIGNED_PRESENT";
};

const STATUS_STYLES: Record<
  MapStatus,
  { bg: string; border: string; label: string; dot: string }
> = {
  ASSIGNED_PRESENT: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    label: "Monitoruje",
    dot: "bg-green-500",
  },
  ASSIGNED_ABSENT: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    label: "Nieobecny",
    dot: "bg-yellow-500",
  },
  UNASSIGNED: {
    bg: "bg-muted/50",
    border: "border-border",
    label: "Nieprzypisany",
    dot: "bg-muted-foreground",
  },
};

export const EventMapGrid = ({
  maps,
  guildId,
  eventId,
  heroId,
  onAssignClick,
  onUnassignClick,
  currentMemberId,
}: EventMapGridProps) => {
  const { t } = useTranslation();
  const { data: permissions } = useGuildPermissions();

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  if (maps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MapPin className="w-10 h-10 mb-2 opacity-50" />
        <p>{t("events.maps.noMaps")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {maps.map((map) => {
        const status = getMapStatus(map);
        const style = STATUS_STYLES[status];
        const memberCount = map.assignedMembers?.length || 0;
        const isAssignedToMe = map.assignedMembers?.some(
          (m) => m.id === currentMemberId,
        );

        const canUnassign = isAssignedToMe || canManage;

        return (
          <div
            key={map.id}
            className={cn(
              "p-3 rounded-lg border transition-colors",
              style.bg,
              style.border,
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("w-2 h-2 rounded-full", style.dot)} />
                  <span className="font-medium truncate">{map.mapName}</span>
                  <span className="text-xs text-muted-foreground/60 font-mono">
                    #{map.id.slice(0, 8)}
                  </span>
                </div>

                {memberCount > 0 ? (
                  <div className="flex items-center gap-2">
                    {/* Avatar stack */}
                    <div className="flex -space-x-2">
                      {map.assignedMembers.slice(0, 3).map((member) => (
                        <div
                          key={member.id}
                          className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center overflow-hidden"
                          title={member.name}
                        >
                          <img
                            src={getDiscordAvatarUrl(
                              member.userId,
                              member.avatar,
                              32,
                            )}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {memberCount > 3 && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium text-primary">
                          +{memberCount - 3}
                        </div>
                      )}
                    </div>
                    {memberCount === 1 ? (
                      <MemberName member={map.assignedMembers![0]} />
                    ) : (
                      <span className="text-sm text-muted-foreground truncate">
                        {memberCount} osób
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("events.maps.status.unassigned")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {memberCount === 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => onAssignClick?.(map.id)}
                    title={t("events.maps.assign")}
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                ) : (
                  canUnassign && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onUnassignClick?.(map.id)}
                      title={t("events.maps.unassign")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
