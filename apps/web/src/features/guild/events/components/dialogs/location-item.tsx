import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Reorder } from "framer-motion";
import { Input } from "@lootlog/ui/components/input";
import { useId, useRef } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { LocationData } from "./map-manage-dialog.types";

interface LocationItemProps {
  location: LocationData;
  editingLocation: { id: string; name: string } | null;
  setEditingLocation: (loc: { id: string; name: string } | null) => void;
  handleUpdateLocation: () => void;
  handleDeleteLocation: (id: string) => void;
  isDeleting: boolean;
  deletionDisabled: boolean;
  isReordering: boolean;
  onDragEnd: () => void;
  onMove: (offset: -1 | 1) => void;
}

export const LocationItem = ({
  location,
  editingLocation,
  setEditingLocation,
  handleUpdateLocation,
  handleDeleteLocation,
  isDeleting,
  deletionDisabled,
  isReordering,
  onDragEnd,
  onMove,
}: LocationItemProps) => {
  const { t } = useTranslation();
  const handle = useRef<HTMLButtonElement>(null);
  const hintId = useId();

  return (
    <Reorder.Item
      value={location}
      className="flex items-center gap-2 px-2 py-1.5 rounded border bg-muted/30"
      dragListener={!isReordering}
      onDragEnd={onDragEnd}
    >
      <button
        ref={handle}
        type="button"
        aria-label={t("events.locations.move", { name: location.name })}
        aria-describedby={hintId}
        disabled={isReordering}
        onKeyDown={(event) => {
          const offset =
            event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;

          if (offset === 0) return;
          event.preventDefault();
          onMove(offset);
          // The row moves in the list; keep the handle focused for the next press.
          requestAnimationFrame(() => handle.current?.focus());
        }}
        className="-my-1 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground/50 outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-3" />
      </button>
      <span id={hintId} className="sr-only">
        {t("events.locations.moveHint")}
      </span>
      {editingLocation?.id === location.id ? (
        <Input
          value={editingLocation.name}
          onChange={(e) =>
            setEditingLocation({
              ...editingLocation,
              name: e.target.value,
            })
          }
          size="sm"
          className="text-xs flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing)
              handleUpdateLocation();

            if (e.key === "Escape") setEditingLocation(null);
          }}
          onBlur={handleUpdateLocation}
        />
      ) : (
        <span className="min-w-0 flex-1 text-xs break-words">
          {location.name}
        </span>
      )}
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        ({location.maps.length})
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        aria-label={t("events.locations.edit")}
        onClick={() =>
          setEditingLocation({
            id: location.id,
            name: location.name,
          })
        }
        className="rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        aria-label={t("events.locations.delete")}
        icon=<Trash2 className="size-3" />
        onClick={() => handleDeleteLocation(location.id)}
        className="rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        disabled={deletionDisabled}
        loading={isDeleting}
      />
    </Reorder.Item>
  );
};
