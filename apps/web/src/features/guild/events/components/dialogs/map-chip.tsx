import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { MapPin, X } from "lucide-react";
import type { LocationData } from "./map-manage-dialog.types";
import { useTranslation } from "react-i18next";

interface MapChipProps {
  map: { id: string; mapId: number; mapName: string };
  locations: LocationData[];
  onDelete: () => void;
  onLocationChange: (locationId: string | null) => void;
  isDeleting: boolean;
  deletionDisabled: boolean;
}

export const MapChip = ({
  map,
  locations,
  onDelete,
  onLocationChange,
  isDeleting,
  deletionDisabled,
}: MapChipProps) => {
  const { t } = useTranslation();

  return (
    <div className="inline-flex h-7 items-center gap-0.5 rounded border border-primary/20 bg-primary/10 pr-0.5 pl-2 transition-colors hover:bg-primary/15">
      <span className="mr-0.5 text-xs font-medium text-primary">
        {map.mapName}
      </span>

      {locations.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                type="button"
                aria-label={`${t("events.locations.addTo")}: ${map.mapName}`}
                className="rounded text-primary/60 hover:bg-primary/20 hover:text-primary"
              />
            }
          >
            <MapPin className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onLocationChange(null)}>
              {t("events.locations.noLocation")}
            </DropdownMenuItem>
            {locations.map((location) => (
              <DropdownMenuItem
                key={location.id}
                onClick={() => onLocationChange(location.id)}
              >
                {location.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        type="button"
        aria-label={t("events.maps.remove", { name: map.mapName })}
        icon=<X className="size-3" />
        onClick={onDelete}
        className="rounded text-primary/60 hover:bg-destructive/20 hover:text-destructive"
        disabled={deletionDisabled}
        loading={isDeleting}
      />
    </div>
  );
};
