import { useTranslation } from "react-i18next";
import { MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Permission } from "@lootlog/types";
import { cn } from "@lootlog/ui/lib/utils";
import type { EventMap, EventMapLocation } from "../../types/api";
import type { PlayerPresence } from "../../hooks/socket/use-event-presence";
import {
  isWindowActive,
  type WindowStatus,
} from "../../hooks/use-window-status";
import type { CoverageGap } from "../../hooks/queries/use-map-coverage-timer";
import { MapCard, getMapStatus, STATUS_STYLES } from "./map-card";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";

interface EventMapGridProps {
  locations?: EventMapLocation[];
  maps: EventMap[];
  onSelfAssignClick?: (mapId: string) => void;
  onSelfUnassignClick?: (mapId: string) => void;
  onManageClick?: (mapId: string) => void;
  currentMemberId?: number;
  presenceData?: Map<string, PlayerPresence[]>;
  assignmentDisabled?: boolean;
  assignmentEnabledAt?: Date | null;
  assignmentDisabledMessage?: string | null;
  windowStatus?: WindowStatus;
  activeGapsMap?: Map<string, CoverageGap>;
  vertical?: boolean;
}

interface LocationSectionProps {
  title: string;
  maps: EventMap[];
  canManage: boolean;
  currentMemberId?: number;
  presenceData?: Map<string, PlayerPresence[]>;
  assignmentDisabled: boolean;
  assignmentEnabledAt?: Date | null;
  assignmentDisabledMessage?: string | null;
  windowStatus: WindowStatus;
  activeGapsMap?: Map<string, CoverageGap>;
  vertical: boolean;
  onSelfAssignClick?: (mapId: string) => void;
  onSelfUnassignClick?: (mapId: string) => void;
  onManageClick?: (mapId: string) => void;
  defaultExpanded?: boolean;
  isUngrouped?: boolean;
}

const LocationSection = ({
  title,
  maps,
  canManage,
  currentMemberId,
  presenceData,
  assignmentDisabled,
  assignmentEnabledAt,
  assignmentDisabledMessage,
  windowStatus,
  activeGapsMap,
  vertical,
  onSelfAssignClick,
  onSelfUnassignClick,
  onManageClick,
  defaultExpanded = true,
  isUngrouped = false,
}: LocationSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (maps.length === 0) return null;

  const canShowCoverageCount =
    isWindowActive(windowStatus) && presenceData !== undefined;
  const coveredCount = canShowCoverageCount
    ? maps.filter(
        (map) => getMapStatus(map, presenceData) === "ASSIGNED_PRESENT",
      ).length
    : 0;
  const handleExpandedChange = () => {
    setIsExpanded((currentExpanded) => !currentExpanded);
  };

  return (
    <div
      data-map-location={title}
      className={cn(
        "border-b border-border/70 last:border-b-0",
        isUngrouped && "text-muted-foreground",
      )}
    >
      <button
        type="button"
        onClick={handleExpandedChange}
        aria-expanded={isExpanded}
        className={cn(
          "flex min-h-10 w-full cursor-pointer items-center gap-2 bg-muted/20 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/40",
          isUngrouped && "text-muted-foreground",
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">{title}</span>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">
          {canShowCoverageCount ? (
            <span
              className={cn(
                coveredCount === maps.length
                  ? "text-green-500"
                  : coveredCount > 0
                    ? "text-yellow-500"
                    : "text-destructive",
              )}
            >
              {coveredCount}/{maps.length}
            </span>
          ) : (
            `(${maps.length})`
          )}
        </span>
      </button>
      <div
        hidden={!isExpanded}
        data-map-location-content={title}
        className={cn(
          "divide-y divide-border/70",
          vertical
            ? "flex flex-col"
            : "grid grid-cols-1 sm:grid-cols-2 sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(odd)]:border-border/70",
          !isExpanded && "hidden",
        )}
      >
        {maps.map((map) => {
          const status = getMapStatus(map, presenceData);
          const style = STATUS_STYLES[status];

          return (
            <MapCard
              key={map.id}
              map={map}
              status={status}
              style={style}
              canManage={canManage}
              currentMemberId={currentMemberId}
              presenceData={presenceData}
              assignmentDisabled={assignmentDisabled}
              assignmentEnabledAt={assignmentEnabledAt}
              assignmentDisabledMessage={assignmentDisabledMessage}
              onSelfAssignClick={onSelfAssignClick}
              onSelfUnassignClick={onSelfUnassignClick}
              onManageClick={onManageClick}
              windowStatus={windowStatus}
              activeGap={activeGapsMap?.get(map.id)}
            />
          );
        })}
      </div>
    </div>
  );
};

export const EventMapGrid = ({
  locations = [],
  maps,
  onSelfAssignClick,
  onSelfUnassignClick,
  onManageClick,
  currentMemberId,
  presenceData,
  assignmentDisabled = false,
  assignmentEnabledAt,
  assignmentDisabledMessage,
  windowStatus = "OPEN",
  activeGapsMap,
  vertical = false,
}: EventMapGridProps) => {
  const { t } = useTranslation();
  const { data: permissions } = useGuildPermissions();

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  const totalMaps =
    locations.reduce((sum, loc) => sum + loc.maps.length, 0) + maps.length;

  if (totalMaps === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MapPin className="w-10 h-10 mb-2 opacity-50" />
        <p>{t("events.maps.noMaps")}</p>
      </div>
    );
  }

  if (locations.length === 0 && maps.length > 0) {
    return (
      <div
        className={
          vertical
            ? "flex flex-col divide-y divide-border/70"
            : "grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-2 sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(odd)]:border-border/70"
        }
      >
        {maps.map((map) => {
          const status = getMapStatus(map, presenceData);
          const style = STATUS_STYLES[status];

          return (
            <MapCard
              key={map.id}
              map={map}
              status={status}
              style={style}
              canManage={canManage ?? false}
              currentMemberId={currentMemberId}
              presenceData={presenceData}
              assignmentDisabled={assignmentDisabled}
              assignmentEnabledAt={assignmentEnabledAt}
              assignmentDisabledMessage={assignmentDisabledMessage}
              onSelfAssignClick={onSelfAssignClick}
              onSelfUnassignClick={onSelfUnassignClick}
              onManageClick={onManageClick}
              windowStatus={windowStatus}
              activeGap={activeGapsMap?.get(map.id)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {locations.map((location) => (
        <LocationSection
          key={location.id}
          title={location.name}
          maps={location.maps}
          canManage={canManage ?? false}
          currentMemberId={currentMemberId}
          presenceData={presenceData}
          assignmentDisabled={assignmentDisabled}
          assignmentEnabledAt={assignmentEnabledAt}
          assignmentDisabledMessage={assignmentDisabledMessage}
          windowStatus={windowStatus}
          activeGapsMap={activeGapsMap}
          vertical={vertical}
          onSelfAssignClick={onSelfAssignClick}
          onSelfUnassignClick={onSelfUnassignClick}
          onManageClick={onManageClick}
        />
      ))}
      {maps.length > 0 && (
        <LocationSection
          title={t("events.locations.noLocation")}
          maps={maps}
          canManage={canManage ?? false}
          currentMemberId={currentMemberId}
          presenceData={presenceData}
          assignmentDisabled={assignmentDisabled}
          assignmentEnabledAt={assignmentEnabledAt}
          windowStatus={windowStatus}
          activeGapsMap={activeGapsMap}
          vertical={vertical}
          onSelfAssignClick={onSelfAssignClick}
          onSelfUnassignClick={onSelfUnassignClick}
          onManageClick={onManageClick}
          isUngrouped
        />
      )}
    </div>
  );
};
