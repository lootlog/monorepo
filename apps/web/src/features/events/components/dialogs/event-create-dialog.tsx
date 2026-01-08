import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Switch } from "@lootlog/ui/components/switch";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { useCreateEvent } from "../../hooks/mutations/use-create-event";
import {
  useMapTemplates,
  type MapTemplate,
} from "@/features/guild-settings/map-templates-settings/hooks/use-map-templates";
import { MapInput } from "../maps/map-input";
import { toast } from "sonner";
import {
  Plus,
  X,
  Swords,
  MapPin,
  FileText,
  Trophy,
  Loader2,
} from "lucide-react";
import { useGuildId } from "@/hooks/context/use-guild-id";

interface EventCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HeroMap {
  mapId: number;
  mapName: string;
}

interface HeroNpc {
  npcId: string;
  npcName: string;
  maps: HeroMap[];
}

interface FormData {
  name: string;
  world: string;
  active: boolean;
}

export const EventCreateDialog = ({
  open,
  onOpenChange,
}: EventCreateDialogProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const navigate = useNavigate();
  const { mutate: createEvent, isPending } = useCreateEvent();
  const { data: mapTemplates } = useMapTemplates();

  const [heroNpcs, setHeroNpcs] = useState<HeroNpc[]>([]);
  const [showHeroForm, setShowHeroForm] = useState(false);
  const [newHero, setNewHero] = useState<HeroNpc>({
    npcId: "",
    npcName: "",
    maps: [],
  });
  const [newMapForHero, setNewMapForHero] = useState("");
  const [pendingMap, setPendingMap] = useState<HeroMap | null>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      name: "",
      world: "",
      active: true,
    },
  });

  const resetForm = () => {
    reset();
    setHeroNpcs([]);
    setShowHeroForm(false);
    setNewHero({ npcId: "", npcName: "", maps: [] });
    setNewMapForHero("");
    setPendingMap(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleAddMapToHero = () => {
    if (pendingMap && !newHero.maps.some((m) => m.mapId === pendingMap.mapId)) {
      setNewHero({ ...newHero, maps: [...newHero.maps, pendingMap] });
      setNewMapForHero("");
      setPendingMap(null);
    }
  };

  const handleRemoveMapFromHero = (index: number) => {
    setNewHero({
      ...newHero,
      maps: newHero.maps.filter((_, i) => i !== index),
    });
  };

  const handleAddHero = () => {
    if (newHero.npcName && newHero.maps.length > 0) {
      setHeroNpcs([...heroNpcs, newHero]);
      setNewHero({ npcId: "", npcName: "", maps: [] });
      setShowHeroForm(false);
    } else {
      toast.error(t("events.createDialog.heroValidation"));
    }
  };

  const handleRemoveHero = (index: number) => {
    setHeroNpcs(heroNpcs.filter((_, i) => i !== index));
  };

  const onSubmit = (data: FormData) => {
    if (!data.name.trim()) {
      toast.error(t("events.createDialog.nameRequired"));
      return;
    }

    if (!data.world.trim()) {
      toast.error(t("events.createDialog.worldRequired"));
      return;
    }

    createEvent(
      {
        name: data.name.trim(),
        world: data.world.trim(),
        active: data.active,
        heroNpcs: heroNpcs.map((h) => ({
          ...(h.npcId && { npcId: Number.parseInt(h.npcId, 10) }),
          npcName: h.npcName,
          maps: h.maps.map((m) => ({ mapId: m.mapId, mapName: m.mapName })),
        })),
      },
      {
        onSuccess: (eventData) => {
          toast.success(t("events.createDialog.success"));
          handleClose(false);
          navigate({ to: `/${guildId}/events/${eventData.id}` });
        },
        onError: () => {
          toast.error(t("events.createDialog.error"));
        },
      },
    );
  };

  const hasLotsOfHeroes = heroNpcs.length > 3;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.createDialog.title")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {t("events.createDialog.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto"
        >
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.nameLabel")}
              </Label>
              <Input
                {...register("name", { required: true })}
                placeholder={t("events.createDialog.namePlaceholder")}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.createDialog.worldLabel")}
              </Label>
              <Input
                {...register("world", { required: true })}
                placeholder={t("events.createDialog.worldPlaceholder")}
                className="h-9 text-sm"
              />
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-lg border">
              <Label
                htmlFor="active"
                className="text-sm font-medium cursor-pointer"
              >
                {t("events.createDialog.activeLabel")}
              </Label>
              <Switch
                id="active"
                checked={watch("active")}
                onCheckedChange={(val) => setValue("active", val)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Swords className="size-3" />
                  {t("events.heroes.title")}
                  {heroNpcs.length > 0 && (
                    <span className="text-foreground">({heroNpcs.length})</span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowHeroForm(!showHeroForm)}
                >
                  <Plus className="size-3" />
                  {t("events.createDialog.addHero")}
                </Button>
              </div>

              {heroNpcs.length === 0 && !showHeroForm && (
                <div className="py-3 px-4 rounded-lg border border-dashed text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("events.createDialog.noHeroesHint")}
                  </p>
                </div>
              )}

              {heroNpcs.length > 0 && (
                <ScrollArea
                  className={hasLotsOfHeroes ? "h-[140px]" : undefined}
                >
                  <div className="space-y-2">
                    {heroNpcs.map((hero, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">
                              {hero.npcName}
                            </p>
                            {hero.npcId && (
                              <p className="text-[10px] font-mono text-muted-foreground">
                                ID: {hero.npcId}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveHero(index)}
                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {hero.maps.map((map) => (
                            <span
                              key={map.mapId}
                              className="inline-flex items-center gap-1 pl-1.5 pr-1.5 py-0.5 bg-primary/10 rounded border border-primary/20"
                            >
                              <MapPin className="size-2.5 text-primary" />
                              <span className="text-[10px] font-medium text-primary">
                                {map.mapName}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {showHeroForm && (
                <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("events.createDialog.heroIdLabel")}
                      </Label>
                      <Input
                        type="number"
                        value={newHero.npcId}
                        onChange={(e) =>
                          setNewHero({ ...newHero, npcId: e.target.value })
                        }
                        placeholder={t("events.createDialog.heroIdPlaceholder")}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("events.createDialog.heroNameLabel")}
                      </Label>
                      <Input
                        value={newHero.npcName}
                        onChange={(e) =>
                          setNewHero({ ...newHero, npcName: e.target.value })
                        }
                        placeholder={t(
                          "events.createDialog.heroNamePlaceholder",
                        )}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("events.createDialog.heroMapsLabel")}
                        {newHero.maps.length > 0 && (
                          <span className="ml-1 text-foreground">
                            ({newHero.maps.length})
                          </span>
                        )}
                      </Label>
                      {mapTemplates && mapTemplates.length > 0 && (
                        <Select
                          onValueChange={(templateId) => {
                            const template = mapTemplates.find(
                              (t: MapTemplate) => t.id === templateId,
                            );
                            if (template) {
                              const existingMapIds = new Set(
                                newHero.maps.map((m) => m.mapId),
                              );
                              const newMaps = template.maps
                                .filter((m) => !existingMapIds.has(m.id))
                                .map((m) => ({ mapId: m.id, mapName: m.name }));
                              setNewHero({
                                ...newHero,
                                maps: [...newHero.maps, ...newMaps],
                              });
                              toast.success(
                                t("events.maps.templateLoaded", {
                                  count: newMaps.length,
                                  name: template.name,
                                }),
                              );
                            }
                          }}
                        >
                          <SelectTrigger className="w-auto h-6 text-[10px] px-2 gap-1">
                            <FileText className="size-2.5" />
                            <SelectValue
                              placeholder={t(
                                "events.createDialog.fromTemplate",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {mapTemplates.map((template: MapTemplate) => (
                              <SelectItem
                                key={template.id}
                                value={template.id}
                                className="text-xs"
                              >
                                {template.name} ({template.maps.length})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {newHero.maps.length > 0 && (
                      <ScrollArea
                        className={
                          newHero.maps.length > 8 ? "h-[60px]" : undefined
                        }
                      >
                        <div className="flex flex-wrap gap-1 p-2 rounded border bg-background/50 min-h-[32px]">
                          {newHero.maps.map((map, idx) => (
                            <div
                              key={map.mapId}
                              className="group inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 bg-primary/10 hover:bg-primary/15 rounded border border-primary/20 transition-colors"
                            >
                              <span className="text-[10px] font-medium text-primary">
                                {map.mapName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMapFromHero(idx)}
                                className="p-0.5 rounded hover:bg-destructive/20 text-primary/60 hover:text-destructive transition-colors"
                              >
                                <X className="size-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}

                    <div className="flex items-center gap-2">
                      <MapInput
                        value={newMapForHero}
                        onChange={setNewMapForHero}
                        onMapSelect={(map) => {
                          setPendingMap({ mapId: map.id, mapName: map.name });
                        }}
                        placeholder={t("events.createDialog.mapPlaceholder")}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddMapToHero();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={handleAddMapToHero}
                        disabled={!pendingMap}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddHero}
                    variant="secondary"
                    size="sm"
                    className="w-full h-8"
                    disabled={!newHero.npcName || newHero.maps.length === 0}
                  >
                    <Plus className="size-3 mr-1" />
                    {t("events.createDialog.addHero")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="px-5 py-3 border-t bg-muted/30 shrink-0 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            className="flex-1"
          >
            {t("events.createDialog.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="flex-1"
            onClick={handleSubmit(onSubmit)}
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                {t("events.createDialog.creating")}
              </>
            ) : (
              <>
                <Trophy className="size-3.5 mr-1.5" />
                {t("events.create")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
