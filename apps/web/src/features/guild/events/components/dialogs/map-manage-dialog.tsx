import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Reorder } from "framer-motion";
import { FolderPlus, MapPin, Search } from "lucide-react";
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
    setIsDragging,
    handleDragEnd,
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
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.locations.title")}
              </Label>

              <div className="flex gap-2">
                <Input
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder={t("events.locations.namePlaceholder")}
                  className="h-8 text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing)
                      handleCreateLocation();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
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
                      onDragStart={() => {
                        setIsDragging(true);
                      }}
                      onDragEnd={handleDragEnd}
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
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                    <SelectTrigger className="h-7 text-xs w-[180px]">
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

              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("events.maps.searchPlaceholder")}
                className="h-9 text-sm"
              />

              <ScrollArea className="h-[180px] rounded-lg border relative">
                {isAdding && (
                  <div className="absolute inset-0 bg-background backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <Spinner className="size-5 text-primary" />
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
                          disabled={isAdding}
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
