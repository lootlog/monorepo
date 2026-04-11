import { Reorder } from "framer-motion";
import { Input } from "@lootlog/ui/components/input";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { LocationData } from "./map-manage-dialog.types";

interface LocationItemProps {
  location: LocationData;
  editingLocation: { id: string; name: string } | null;
  setEditingLocation: (loc: { id: string; name: string } | null) => void;
  handleUpdateLocation: () => void;
  handleDeleteLocation: (id: string) => void;
  isDeleting: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export const LocationItem = ({
  location,
  editingLocation,
  setEditingLocation,
  handleUpdateLocation,
  handleDeleteLocation,
  isDeleting,
  onDragStart,
  onDragEnd,
}: LocationItemProps) => {
  return (
    <Reorder.Item
      value={location}
      className="flex items-center gap-2 px-2 py-1.5 rounded border bg-muted/30"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <GripVertical className="size-3 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
      {editingLocation?.id === location.id ? (
        <Input
          value={editingLocation.name}
          onChange={(e) =>
            setEditingLocation({
              ...editingLocation,
              name: e.target.value,
            })
          }
          className="h-6 text-xs flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUpdateLocation();
            if (e.key === "Escape") setEditingLocation(null);
          }}
          onBlur={handleUpdateLocation}
        />
      ) : (
        <span className="text-xs flex-1">{location.name}</span>
      )}
      <span className="text-[10px] text-muted-foreground">
        ({location.maps.length})
      </span>
      <button
        type="button"
        onClick={() =>
          setEditingLocation({
            id: location.id,
            name: location.name,
          })
        }
        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil className="size-3" />
      </button>
      <button
        type="button"
        onClick={() => handleDeleteLocation(location.id)}
        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        disabled={isDeleting}
      >
        <Trash2 className="size-3" />
      </button>
    </Reorder.Item>
  );
};
