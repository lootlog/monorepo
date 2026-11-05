import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { GameMapPicker } from "@/components/common/game-map-picker";
import { Button } from "@lootlog/ui/components/button";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Reorder } from "framer-motion";
import { useId } from "react";
import { FolderPlus, MapPin } from "lucide-react";
import { AssignedEventMaps } from "./assigned-event-maps";
import { EventMapTemplates } from "./event-map-templates";
import {
  useMapManageDialog,
  type MapManageDialogProps,
} from "./use-map-manage-dialog";

import { LocationItem } from "./location-item";

export const MapManageDialog = ({
  open,
  onOpenChange,
  guildId,
  eventId,
  hero,
}: MapManageDialogProps) => {
  const {
    t,
    newLocationName,
    setNewLocationName,
    handleCreateLocation,
    createLocation,
    displayedLocations,
    handleReorder,
    editingLocation,
    setEditingLocation,
    handleUpdateLocation,
    handleDeleteLocation,
    deleteLocation,
    isReordering,
    handleDragEnd,
    handleMoveLocation,
    heroLocations,
    handleDeleteMap,
    handleMapLocationChange,
    deleteMap,
    templates,
    isAdding,
    pendingTemplate,
    handleLoadTemplate,
    selectedLocationId,
    setSelectedLocationId,
    searchQuery,
    setSearchQuery,
    filteredGameMaps,
    handleAddMapFromGame,
  } = useMapManageDialog({ open, onOpenChange, guildId, eventId, hero });

  const locationNameInputId = useId();
  const mapSearchInputId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <IconDialogHeader
          icon={MapPin}
          title={t("events.maps.manage")}
          description={hero.npcName}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor={locationNameInputId}>
                {t("events.locations.title")}
              </Label>

              <div className="flex gap-2">
                <Input
                  id={locationNameInputId}
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder={t("events.locations.namePlaceholder")}
                  className="text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing)
                      handleCreateLocation();
                  }}
                />
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleCreateLocation}
                  loading={createLocation.isPending}
                  icon=<FolderPlus className="size-3" />
                  disabled={!newLocationName.trim()}
                >
                  {t("events.locations.create")}
                </Button>
              </div>

              {displayedLocations.length > 0 && (
                <Reorder.Group
                  axis="y"
                  values={displayedLocations}
                  onReorder={handleReorder}
                  className="space-y-1.5"
                >
                  {displayedLocations.map((location) => (
                    <LocationItem
                      key={location.id}
                      location={location}
                      editingLocation={editingLocation}
                      setEditingLocation={setEditingLocation}
                      handleUpdateLocation={handleUpdateLocation}
                      handleDeleteLocation={handleDeleteLocation}
                      isDeleting={
                        deleteLocation.isPending &&
                        deleteLocation.variables?.pathParams.locationId ===
                          location.id
                      }
                      deletionDisabled={deleteLocation.isPending}
                      isReordering={isReordering}
                      onDragEnd={handleDragEnd}
                      onMove={(offset) =>
                        handleMoveLocation(location.id, offset)
                      }
                    />
                  ))}
                </Reorder.Group>
              )}
            </div>

            <AssignedEventMaps
              maps={hero.maps}
              locations={heroLocations}
              deletingMapId={deleteMap.variables?.pathParams.mapId}
              deletionPending={deleteMap.isPending}
              onDelete={handleDeleteMap}
              onLocationChange={handleMapLocationChange}
            />
            <EventMapTemplates
              guildId={guildId}
              templates={templates}
              heroLocations={heroLocations}
              isAdding={isAdding}
              pendingTemplate={pendingTemplate}
              handleLoadTemplate={handleLoadTemplate}
            />
            <div className="space-y-2">
              <Label htmlFor={mapSearchInputId}>
                {t("events.maps.searchMaps")}
              </Label>

              {heroLocations.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("events.locations.addTo")}:
                  </span>
                  <Select
                    value={selectedLocationId ?? "none"}
                    onValueChange={(v) =>
                      setSelectedLocationId(v === "none" ? null : v)
                    }
                    items={[
                      {
                        value: "none",
                        label: <>{t("events.locations.noLocation")}</>,
                      },
                      ...heroLocations.map((loc) => ({
                        value: loc.id,
                        label: <>{loc.name}</>,
                      })),
                    ]}
                  >
                    <SelectTrigger className="text-xs w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("events.locations.noLocation")}
                      </SelectItem>
                      {heroLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <GameMapPicker
                id={mapSearchInputId}
                search={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder={t("events.maps.searchPlaceholder")}
                maps={filteredGameMaps}
                onAdd={handleAddMapFromGame}
                noResultsLabel={t("events.maps.noResults", {
                  query: searchQuery,
                })}
                hintLabel={t("events.maps.searchHint")}
                isAdding={isAdding}
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t bg-muted/30 shrink-0">
          <Button
            variant="outline"
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
