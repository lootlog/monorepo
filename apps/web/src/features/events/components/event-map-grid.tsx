import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { Permission } from "@lootlog/types";
import type { EventMap } from "../hooks/queries/use-events";
import type { PlayerPresence } from "../hooks/socket/use-event-presence";
import type { WindowStatus } from "../hooks/queries/use-hero-respawn-config";
import { MapCard, getMapStatus, STATUS_STYLES } from "./map-card";

interface EventMapGridProps {
  maps: EventMap[];
  guildId: string;
  eventId: string;
  heroId: string;
  onSelfAssignClick?: (mapId: string) => void;
  onSelfUnassignClick?: (mapId: string) => void;
  onManageClick?: (mapId: string) => void;
  currentMemberId?: number;
  presenceData?: Map<string, PlayerPresence[]>;
  assignmentDisabled?: boolean;
  assignmentEnabledAt?: Date | null;
  windowStatus?: WindowStatus;
  vertical?: boolean;
}

export const EventMapGrid = ({
  maps,
  guildId,
  eventId,
  heroId: _heroId,
  onSelfAssignClick,
  onSelfUnassignClick,
  onManageClick,
  currentMemberId,
  presenceData,
  assignmentDisabled = false,
  assignmentEnabledAt,
  windowStatus = "OPEN",
  vertical = false,
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
    <div className={vertical ? "flex flex-col gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
      {maps.map((map) => {
        const status = getMapStatus(map, presenceData);
        const style = STATUS_STYLES[status];

        return (
          <MapCard
            key={map.id}
            map={map}
            guildId={guildId}
            eventId={eventId}
            status={status}
            style={style}
            canManage={canManage ?? false}
            currentMemberId={currentMemberId}
            presenceData={presenceData}
            assignmentDisabled={assignmentDisabled}
            assignmentEnabledAt={assignmentEnabledAt}
            onSelfAssignClick={onSelfAssignClick}
            onSelfUnassignClick={onSelfUnassignClick}
            onManageClick={onManageClick}
            windowStatus={windowStatus}
          />
        );
      })}
    </div>
  );
};
