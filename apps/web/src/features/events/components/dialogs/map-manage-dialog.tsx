import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Reorder } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { useEventMutations } from "../../hooks/mutations/use-event-mutations";
import { useLocationMutations } from "../../hooks/mutations/use-location-mutations";
import { toast } from "sonner";
import {
  X,
  MapPin,
  Search,
  FileText,
  Loader2,
  Plus,
  FolderPlus,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";
import { useGameMaps, type GameMap } from "@/hooks/api/use-game-maps";
import {
  useMapTemplates,
  type MapTemplate,
} from "@/features/guild-settings/map-templates-settings/hooks/use-map-templates";

interface MapData {
  id: string;
  mapId: number;
  mapName: string;
  locationId?: string | null;
}

interface LocationData {
  id: string;
  name: string;
  order: number;
  maps: MapData[];
}

interface MapManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  hero: {
    id: string;
    npcName: string;
    locations?: LocationData[];
    maps: MapData[];
  };
}

export const MapManageDialog = ({
  open,
  onOpenChange,
  guildId,
  eventId,
  hero,
}: MapManageDialogProps) => {
  const { t } = useTranslation();
  const { addMap, deleteMap } = useEventMutations(guildId, eventId);
  const {
    createLocation,
    updateLocation,
    deleteLocation,
    reorderLocations,
    assignMapToLocation,
  } = useLocationMutations(guildId, eventId, hero.id);
  const { data: gameMaps } = useGameMaps();
  const { data: templates } = useMapTemplates({ guildId });
  const [searchQuery, setSearchQuery] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [editingLocation, setEditingLocation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );

  // Local state for locations to handle drag & drop smoothly
  const [localLocations, setLocalLocations] = useState<LocationData[]>(
    hero.locations ?? [],
  );
  const isDraggingRef = useRef(false);

  // Sync local state when hero.locations changes (but not during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalLocations(hero.locations ?? []);
    }
  }, [hero.locations]);

  const handleReorder = (newOrder: LocationData[]) => {
    setLocalLocations(newOrder);
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    const locationIds = localLocations.map((loc) => loc.id);
    reorderLocations.mutate(
      { locationIds },
      {
        onError: () => {
          setLocalLocations(hero.locations ?? []);
          toast.error(t("events.locations.errors.updateFailed"));
        },
      },
    );
  };

  // Get all maps (from locations + ungrouped)
  const allMapsFromLocations = hero.locations?.flatMap((loc) => loc.maps) ?? [];
  const allMaps = [...allMapsFromLocations, ...hero.maps];
  const addedMapIds = new Set(allMaps.map((m) => m.mapId));

  const filteredGameMaps = useMemo(() => {
    if (!gameMaps) return [];
    return gameMaps
      .filter(
        (map) =>
          !addedMapIds.has(map.id) &&
          (map.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            map.id.toString().includes(searchQuery)),
      )
      .slice(0, 50);
  }, [gameMaps, addedMapIds, searchQuery]);

  const handleAddMapFromGame = async (gameMap: GameMap) => {
    try {
      const result = await addMap.mutateAsync({
        heroId: hero.id,
        data: { mapId: gameMap.id, mapName: gameMap.name },
      });

      // If a location is selected, assign the map to it
      if (selectedLocationId && result?.id) {
        await assignMapToLocation.mutateAsync({
          mapId: result.id,
          data: { locationId: selectedLocationId },
        });
      }
    } catch (error) {
      const typedError = error as { response?: { status?: number } };
      if (typedError.response?.status === 400) {
        toast.error(t("events.maps.errors.duplicate"));
      } else {
        toast.error(t("events.maps.errors.addFailed"));
      }
    }
  };

  const handleDeleteMap = async (mapId: string) => {
    try {
      await deleteMap.mutateAsync({
        heroId: hero.id,
        mapId: mapId,
      });
    } catch {
      toast.error(t("events.maps.errors.deleteFailed"));
    }
  };

  const handleLoadTemplate = async (
    template: MapTemplate,
    targetLocationId: string | null,
  ) => {
    const mapsToAdd = template.maps.filter((m) => !addedMapIds.has(m.id));

    if (mapsToAdd.length === 0) {
      toast.info(t("events.maps.allTemplatesAdded"));
      return;
    }

    const results = await Promise.allSettled(
      mapsToAdd.map(async (mapItem) => {
        const result = await addMap.mutateAsync({
          heroId: hero.id,
          data: { mapId: mapItem.id, mapName: mapItem.name },
        });
        // Assign to selected location if one is selected
        if (targetLocationId && result?.id) {
          await assignMapToLocation.mutateAsync({
            mapId: result.id,
            data: { locationId: targetLocationId },
          });
        }
        return result;
      }),
    );

    const addedCount = results.filter((r) => r.status === "fulfilled").length;
    if (addedCount > 0) {
      toast.success(
        t("events.maps.templateLoaded", {
          count: addedCount,
          name: template.name,
        }),
      );
    }
  };

  const handleCreateLocation = async () => {
    if (!newLocationName.trim()) return;
    try {
      await createLocation.mutateAsync({ name: newLocationName.trim() });
      setNewLocationName("");
      toast.success(t("events.locations.createSuccess"));
    } catch (error) {
      const typedError = error as { response?: { status?: number } };
      if (typedError.response?.status === 400) {
        toast.error(t("events.locations.errors.duplicateName"));
      } else {
        toast.error(t("events.locations.errors.createFailed"));
      }
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation || !editingLocation.name.trim()) return;
    try {
      await updateLocation.mutateAsync({
        locationId: editingLocation.id,
        data: { name: editingLocation.name.trim() },
      });
      setEditingLocation(null);
      toast.success(t("events.locations.updateSuccess"));
    } catch (error) {
      const typedError = error as { response?: { status?: number } };
      if (typedError.response?.status === 400) {
        toast.error(t("events.locations.errors.duplicateName"));
      } else {
        toast.error(t("events.locations.errors.updateFailed"));
      }
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      await deleteLocation.mutateAsync(locationId);
      toast.success(t("events.locations.deleteSuccess"));
    } catch {
      toast.error(t("events.locations.errors.deleteFailed"));
    }
  };

  const handleMapLocationChange = async (
    mapId: string,
    newLocationId: string | null,
  ) => {
    try {
      await assignMapToLocation.mutateAsync({
        mapId,
        data: { locationId: newLocationId },
      });
    } catch {
      toast.error(t("events.locations.errors.assignFailed"));
    }
  };

  const totalMapsCount = allMaps.length;
  const hasLotsOfMaps = totalMapsCount > 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.maps.manage")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {hero.npcName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Locations Management */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.locations.title")}
              </Label>

              {/* Create new location */}
              <div className="flex gap-2">
                <Input
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder={t("events.locations.namePlaceholder")}
                  className="h-8 text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateLocation();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleCreateLocation}
                  disabled={createLocation.isPending || !newLocationName.trim()}
                >
                  {createLocation.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <FolderPlus className="size-3" />
                  )}
                  {t("events.locations.create")}
                </Button>
              </div>

              {/* Existing locations */}
              {localLocations.length > 0 && (
                <Reorder.Group
                  axis="y"
                  values={localLocations}
                  onReorder={handleReorder}
                  className="space-y-1.5"
                >
                  {localLocations.map((location) => (
                    <LocationItem
                      key={location.id}
                      location={location}
                      editingLocation={editingLocation}
                      setEditingLocation={setEditingLocation}
                      handleUpdateLocation={handleUpdateLocation}
                      handleDeleteLocation={handleDeleteLocation}
                      isDeleting={deleteLocation.isPending}
                      onDragStart={() => {
                        isDraggingRef.current = true;
                      }}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </Reorder.Group>
              )}
            </div>

            {/* Maps display grouped by location */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.maps.assigned")}
                {totalMapsCount > 0 && (
                  <span className="ml-1.5 text-foreground">
                    ({totalMapsCount})
                  </span>
                )}
              </Label>

              {totalMapsCount > 0 ? (
                <ScrollArea className={hasLotsOfMaps ? "h-[140px]" : undefined}>
                  <div className="space-y-3">
                    {/* Maps in locations */}
                    {hero.locations?.map((location) =>
                      location.maps.length > 0 ? (
                        <div key={location.id} className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase">
                            {location.name}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {location.maps.map((map) => (
                              <MapChip
                                key={map.id}
                                map={map}
                                locations={hero.locations ?? []}
                                onDelete={() => handleDeleteMap(map.id)}
                                onLocationChange={(locId) =>
                                  handleMapLocationChange(map.id, locId)
                                }
                                isDeleting={deleteMap.isPending}
                                t={t}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null,
                    )}

                    {/* Ungrouped maps */}
                    {hero.maps.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase">
                          {t("events.locations.noLocation")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {hero.maps.map((map) => (
                            <MapChip
                              key={map.id}
                              map={map}
                              locations={hero.locations ?? []}
                              onDelete={() => handleDeleteMap(map.id)}
                              onLocationChange={(locId) =>
                                handleMapLocationChange(map.id, locId)
                              }
                              isDeleting={deleteMap.isPending}
                              t={t}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="py-3 px-4 rounded-lg border border-dashed text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("events.maps.noMapsAssigned")}
                  </p>
                </div>
              )}
            </div>

            {templates && templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("events.maps.loadFromTemplate")}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((template) => (
                    <Popover key={template.id}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          disabled={addMap.isPending}
                        >
                          <FileText className="size-3" />
                          {template.name}
                          <span className="text-muted-foreground">
                            ({template.maps.length})
                          </span>
                          <Plus className="size-3 ml-0.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="start">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {t("events.locations.addTo")}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-7 text-xs"
                            onClick={() => handleLoadTemplate(template, null)}
                            disabled={addMap.isPending}
                          >
                            {t("events.locations.noLocation")}
                          </Button>
                          {hero.locations?.map((loc) => (
                            <Button
                              key={loc.id}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-7 text-xs"
                              onClick={() =>
                                handleLoadTemplate(template, loc.id)
                              }
                              disabled={addMap.isPending}
                            >
                              {loc.name}
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.maps.searchMaps")}
              </Label>

              {/* Target location selector */}
              {hero.locations && hero.locations.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("events.locations.addTo")}:
                  </span>
                  <Select
                    value={selectedLocationId ?? "none"}
                    onValueChange={(v) =>
                      setSelectedLocationId(v === "none" ? null : v)
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("events.locations.noLocation")}
                      </SelectItem>
                      {hero.locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("events.maps.searchPlaceholder")}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <ScrollArea className="h-[180px] rounded-lg border relative">
                {addMap.isPending && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
                {filteredGameMaps.length > 0 ? (
                  <div className="divide-y">
                    {filteredGameMaps.map((gameMap) => (
                      <label
                        key={gameMap.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={(checked) => {
                            if (checked) handleAddMapFromGame(gameMap);
                          }}
                          disabled={addMap.isPending}
                          className="size-4"
                        />
                        <span className="flex-1 text-sm">{gameMap.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/70">
                          {gameMap.id}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <Search className="size-8 mb-2 opacity-30" />
                    <p className="text-xs">
                      {t("events.maps.noResults", { query: searchQuery })}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <MapPin className="size-8 mb-2 opacity-30" />
                    <p className="text-xs">{t("events.maps.searchHint")}</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t bg-muted/30 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            {t("events.common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// LocationItem component
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

const LocationItem = ({
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

// MapChip component with location selector
interface MapChipProps {
  map: { id: string; mapId: number; mapName: string };
  locations: LocationData[];
  onDelete: () => void;
  onLocationChange: (locationId: string | null) => void;
  isDeleting: boolean;
  t: (key: string) => string;
}

const MapChip = ({
  map,
  locations,
  onDelete,
  onLocationChange,
  isDeleting,
  t,
}: MapChipProps) => {
  const [showSelect, setShowSelect] = useState(false);

  return (
    <div className="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-primary/10 hover:bg-primary/15 rounded border border-primary/20 transition-colors">
      <span className="text-[11px] font-medium text-primary">
        {map.mapName}
      </span>

      {locations.length > 0 && (
        <Select
          open={showSelect}
          onOpenChange={setShowSelect}
          onValueChange={(v) => onLocationChange(v === "none" ? null : v)}
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

      <button
        type="button"
        onClick={onDelete}
        className="p-0.5 rounded hover:bg-destructive/20 text-primary/60 hover:text-destructive transition-colors"
        disabled={isDeleting}
      >
        <X className="size-2.5" />
      </button>
    </div>
  );
};
