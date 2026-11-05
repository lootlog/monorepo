import type { MapTemplateResponseDtoMapsItem } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { GameMapPicker } from "@/components/common/game-map-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { MapPin, X } from "lucide-react";
import { useId } from "react";

import { useMapTemplateForm } from "./use-map-template-form";

export const MapTemplateForm = (
  props: Parameters<typeof useMapTemplateForm>[0],
) => {
  const searchId = useId();

  const {
    Icon,
    t,
    dialogKey,
    form,
    onSubmit,
    maps,
    handleRemoveMap,
    searchQuery,
    setSearchQuery,
    filteredGameMaps,
    handleToggleMap,
    handleClose,
    isPending,
  } = useMapTemplateForm(props);

  return (
    <>
      <IconDialogHeader
        icon={Icon}
        title={t(`settings.mapTemplates.${dialogKey}.title`)}
        description={t(`settings.mapTemplates.${dialogKey}.description`)}
      />

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
                    <FormLabel>
                      {t("settings.mapTemplates.templateName")}
                    </FormLabel>
                    <FormControl
                      render=<Input
                        {...field}
                        placeholder={t(
                          "settings.mapTemplates.templateNamePlaceholder",
                        )}
                        className="text-sm"
                      />
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maps"
                render={() => (
                  <FormItem>
                    <FormLabel>
                      {t("settings.mapTemplates.selectedMaps")}{" "}
                      {maps.length > 0 && (
                        <span className="text-muted-foreground">
                          ({maps.length})
                        </span>
                      )}
                    </FormLabel>

                    {maps.length > 0 && (
                      <ScrollArea className="max-h-[120px]">
                        <div className="flex flex-wrap gap-1.5 pr-3">
                          {maps.map((map: MapTemplateResponseDtoMapsItem) => (
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
                                aria-label={t("common.removeOption", {
                                  label: map.name,
                                })}
                                onClick={() => handleRemoveMap(map.id)}
                                className="-my-1 -mr-1.5 inline-flex size-6 shrink-0 items-center justify-center rounded-sm outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
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

              <div className="space-y-2">
                <Label htmlFor={searchId}>
                  {t("settings.mapTemplates.searchAndAddMaps")}
                </Label>
                <GameMapPicker
                  id={searchId}
                  search={searchQuery}
                  onSearchChange={setSearchQuery}
                  placeholder={t("settings.mapTemplates.searchPlaceholder")}
                  maps={filteredGameMaps}
                  onAdd={(gameMap) => handleToggleMap(gameMap, true)}
                  noResultsLabel={t("settings.mapTemplates.noMapsFound", {
                    query: searchQuery,
                  })}
                  hintLabel={t("settings.mapTemplates.searchHint")}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex gap-2 p-5 border-t shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="flex-1"
            >
              {t("settings.mapTemplates.cancel")}
            </Button>
            <Button
              type="submit"
              loading={isPending}
              icon=<Icon className="size-3.5" />
              className="flex-1"
            >
              {t("settings.mapTemplates.saveTemplate")}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
