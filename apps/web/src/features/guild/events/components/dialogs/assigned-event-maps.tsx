import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useTranslation } from "react-i18next";
import type { MapManageDialogProps } from "./use-map-manage-dialog";

import { MapChip } from "./map-chip";

import type { LocationData } from "./map-manage-dialog.types";

interface AssignedEventMapsProps {
  maps: MapManageDialogProps["hero"]["maps"];
  locations: LocationData[];
  deletingMapId: string | undefined;
  deletionPending: boolean;
  onDelete: (mapId: string) => void;
  onLocationChange: (mapId: string, locationId: string | null) => void;
}

export function AssignedEventMaps({
  maps,
  locations,
  deletingMapId,
  deletionPending,
  onDelete,
  onLocationChange,
}: AssignedEventMapsProps) {
  const { t } = useTranslation();

  const totalMapsCount =
    maps.length +
    locations.reduce((count, location) => count + location.maps.length, 0);

  const groups = [
    ...locations.map((location) => ({
      key: `location:${location.id}`,
      name: location.name,
      maps: location.maps,
      unassigned: false,
    })),
    {
      key: "unassigned",
      name: t("events.locations.noLocation"),
      maps,
      unassigned: true,
    },
  ];

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("events.maps.assigned")}
        {totalMapsCount > 0 && (
          <span className="ml-1.5 text-foreground">({totalMapsCount})</span>
        )}
      </Label>
      {totalMapsCount > 0 ? (
        <ScrollArea className={totalMapsCount > 10 ? "h-[140px]" : undefined}>
          <div className="space-y-3">
            {groups.map(
              (group) =>
                group.maps.length > 0 && (
                  <div key={group.key} className="space-y-1">
                    <p
                      className={
                        group.unassigned
                          ? "text-[10px] font-medium text-muted-foreground/60 uppercase"
                          : "text-[10px] font-medium text-muted-foreground uppercase"
                      }
                    >
                      {group.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.maps.map((map) => (
                        <MapChip
                          key={map.id}
                          map={map}
                          locations={locations}
                          onDelete={() => onDelete(map.id)}
                          onLocationChange={(locationId) =>
                            onLocationChange(map.id, locationId)
                          }
                          isDeleting={
                            deletionPending && deletingMapId === map.id
                          }
                          deletionDisabled={deletionPending}
                        />
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            {t("events.maps.noMapsAssigned")}
          </p>
        </div>
      )}
    </div>
  );
}
