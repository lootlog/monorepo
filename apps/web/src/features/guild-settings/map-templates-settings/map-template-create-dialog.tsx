import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { FileText, X, MapPin, Search } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { toast } from "sonner";
import { useCreateMapTemplate } from "./hooks/use-map-template-mutations";
import { useGameMaps, type GameMap } from "@/hooks/api/use-game-maps";
import type { MapItem } from "./hooks/use-map-templates";

interface MapTemplateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("settings.mapTemplates.form.nameRequired")),
    maps: z
      .array(z.object({ id: z.number(), name: z.string() }))
      .min(1, t("settings.mapTemplates.form.mapsRequired")),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export const MapTemplateCreateDialog = ({
  open,
  onOpenChange,
}: MapTemplateCreateDialogProps) => {
  const { t } = useTranslation();
  const { data: gameMaps } = useGameMaps();
  const { mutate: createTemplate, isPending } = useCreateMapTemplate();

  const [searchQuery, setSearchQuery] = useState("");

  const formSchema = createFormSchema(t);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      maps: [],
    },
  });

  const maps = form.watch("maps");

  const filteredGameMaps = useMemo(() => {
    if (!gameMaps) return [];
    const addedMapIds = new Set(maps.map((m) => m.id));
    return gameMaps
      .filter(
        (map) =>
          !addedMapIds.has(map.id) &&
          (map.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            map.id.toString().includes(searchQuery)),
      )
      .slice(0, 50);
  }, [gameMaps, maps, searchQuery]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setSearchQuery("");
    }
    onOpenChange(isOpen);
  };

  const handleToggleMap = (gameMap: GameMap, checked: boolean) => {
    const currentMaps = form.getValues("maps");
    if (checked) {
      form.setValue("maps", [
        ...currentMaps,
        { id: gameMap.id, name: gameMap.name },
      ]);
    } else {
      form.setValue(
        "maps",
        currentMaps.filter((m) => m.id !== gameMap.id),
      );
    }
  };

  const handleRemoveMap = (mapId: number) => {
    const currentMaps = form.getValues("maps");
    form.setValue(
      "maps",
      currentMaps.filter((m) => m.id !== mapId),
    );
  };

  const onSubmit = (data: FormData) => {
    createTemplate(
      {
        name: data.name.trim(),
        maps: data.maps,
      },
      {
        onSuccess: () => {
          toast.success(t("settings.mapTemplates.toasts.created"));
          handleClose(false);
        },
        onError: (error: unknown) => {
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 400) {
            toast.error(t("settings.mapTemplates.toasts.duplicateName"));
          } else {
            toast.error(t("settings.mapTemplates.toasts.createError"));
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="size-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("settings.mapTemplates.createDialog.title")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {t("settings.mapTemplates.createDialog.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col max-h-[calc(90vh-80px)]"
          >
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("settings.mapTemplates.templateName")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t(
                            "settings.mapTemplates.templateNamePlaceholder",
                          )}
                          className="h-9 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maps"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("settings.mapTemplates.selectedMaps")}{" "}
                        {maps.length > 0 && (
                          <span className="text-muted-foreground normal-case">
                            ({maps.length})
                          </span>
                        )}
                      </FormLabel>

                      {maps.length > 0 && (
                        <ScrollArea className="max-h-[120px]">
                          <div className="flex flex-wrap gap-1.5 pr-3">
                            {maps.map((map: MapItem) => (
                              <div
                                key={map.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 rounded border border-primary/20 max-w-[calc(50%-3px)]"
                              >
                                <MapPin className="w-3 h-3 text-primary shrink-0" />
                                <span className="text-xs font-medium text-primary truncate">
                                  {map.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMap(map.id)}
                                  className="hover:text-destructive shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("settings.mapTemplates.searchAndAddMaps")}
                  </FormLabel>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("settings.mapTemplates.searchPlaceholder")}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>

                  <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                    {filteredGameMaps.length > 0 ? (
                      <div className="divide-y">
                        {filteredGameMaps.map((gameMap) => (
                          <label
                            key={gameMap.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={maps.some(
                                (m: MapItem) => m.id === gameMap.id,
                              )}
                              onCheckedChange={(checked) =>
                                handleToggleMap(gameMap, checked === true)
                              }
                            />
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="flex-1 text-sm">
                              {gameMap.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ID: {gameMap.id}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t("settings.mapTemplates.noMapsFound", {
                          query: searchQuery,
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t("settings.mapTemplates.searchHint")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex gap-2 p-5 border-t shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleClose(false)}
                className="flex-1"
              >
                {t("settings.mapTemplates.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Spinner className="size-3.5 mr-1.5" />
                    {t("settings.mapTemplates.createDialog.creating")}
                  </>
                ) : (
                  <>
                    <FileText className="size-3.5 mr-1.5" />
                    {t("settings.mapTemplates.saveTemplate")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
