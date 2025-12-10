"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { useEventMutations } from "../hooks/mutations/use-event-mutations";
import { toast } from "sonner";
import { X, MapPin, Search, FileText, Loader2, Plus } from "lucide-react";
import { useGameMaps, type GameMap } from "@/hooks/api/use-game-maps";
import {
  useMapTemplates,
  type MapTemplate,
} from "@/features/guild-settings/map-templates-settings/hooks/use-map-templates";

interface MapManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  hero: {
    id: string;
    npcName: string;
    maps: {
      id: string;
      mapId: number;
      mapName: string;
    }[];
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
  const { data: gameMaps } = useGameMaps();
  const { data: templates } = useMapTemplates();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGameMaps = useMemo(() => {
    if (!gameMaps) return [];
    const addedMapIds = new Set(hero.maps.map((m) => m.mapId));
    return gameMaps
      .filter(
        (map) =>
          !addedMapIds.has(map.id) &&
          (map.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            map.id.toString().includes(searchQuery)),
      )
      .slice(0, 50);
  }, [gameMaps, hero.maps, searchQuery]);

  const handleAddMapFromGame = async (gameMap: GameMap) => {
    try {
      await addMap.mutateAsync({
        heroId: hero.id,
        data: { mapId: gameMap.id, mapName: gameMap.name },
      });
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

  const handleLoadTemplate = async (template: MapTemplate) => {
    const existingMapIds = new Set(hero.maps.map((m) => m.mapId));
    const mapsToAdd = template.maps.filter((m) => !existingMapIds.has(m.id));

    if (mapsToAdd.length === 0) {
      toast.info(t("events.maps.allTemplatesAdded"));
      return;
    }

    const results = await Promise.allSettled(
      mapsToAdd.map((mapItem) =>
        addMap.mutateAsync({
          heroId: hero.id,
          data: { mapId: mapItem.id, mapName: mapItem.name },
        }),
      ),
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

  const hasLotsOfMaps = hero.maps.length > 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
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
                {t("events.maps.assigned")}
                {hero.maps.length > 0 && (
                  <span className="ml-1.5 text-foreground">
                    ({hero.maps.length})
                  </span>
                )}
              </Label>

              {hero.maps.length > 0 ? (
                <ScrollArea
                  className={hasLotsOfMaps ? "h-[120px]" : undefined}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {hero.maps.map((map) => (
                      <div
                        key={map.id}
                        className="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-primary/10 hover:bg-primary/15 rounded border border-primary/20 transition-colors"
                      >
                        <span className="text-[11px] font-medium text-primary">
                          {map.mapName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMap(map.id)}
                          className="p-0.5 rounded hover:bg-destructive/20 text-primary/60 hover:text-destructive transition-colors"
                          disabled={deleteMap.isPending}
                        >
                          <X className="size-2.5" />
                        </button>
                      </div>
                    ))}
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
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => handleLoadTemplate(template)}
                      disabled={addMap.isPending}
                    >
                      <FileText className="size-3" />
                      {template.name}
                      <span className="text-muted-foreground">
                        ({template.maps.length})
                      </span>
                      <Plus className="size-3 ml-0.5" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.maps.searchMaps")}
              </Label>
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
