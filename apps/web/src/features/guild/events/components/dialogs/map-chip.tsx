import { Button } from "@lootlog/ui/components/button";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@lootlog/ui/components/select";
import { GripVertical, X } from "lucide-react";
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
  const [showSelect, setShowSelect] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-primary/10 hover:bg-primary/15 rounded border border-primary/20 transition-colors">
      <span className="text-[11px] font-medium text-primary">
        {map.mapName}
      </span>

      {locations.length > 0 && (
        <Select<string>
          open={showSelect}
          onOpenChange={setShowSelect}
          onValueChange={(value) =>
            onLocationChange(value === "none" ? null : value)
          }
          items={[
            { value: "none", label: <>{t("events.locations.noLocation")}</> },
            ...locations.map((loc) => ({
              value: loc.id,
              label: <>{loc.name}</>,
            })),
          ]}
        >
          <SelectTrigger className="h-4 w-4 p-0 border-0 bg-transparent hover:bg-primary/20 rounded">
            <GripVertical className="size-2.5 text-primary/60" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              {t("events.locations.noLocation")}
            </SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={t("events.delete")}
        icon={<X className="size-2.5" />}
        onClick={onDelete}
        className="size-5 p-0.5 rounded hover:bg-destructive/20 text-primary/60 hover:text-destructive transition-colors"
        disabled={deletionDisabled}
        loading={isDeleting}
      ></Button>
    </div>
  );
};
