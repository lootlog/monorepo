import { SearchInput } from "@/components/ui/search-input";
import type { MapTemplateResponseDtoMapsItem } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { MapPin, X } from "lucide-react";

import { useMapTemplateForm } from "./use-map-template-form";

export const MapTemplateForm = (
  props: Parameters<typeof useMapTemplateForm>[0],
) => {
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
      <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-base">
              {t(`settings.mapTemplates.${dialogKey}.title`)}
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              {t(`settings.mapTemplates.${dialogKey}.description`)}
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
                    <FormControl
                      render=<Input
                        {...field}
                        placeholder={t(
                          "settings.mapTemplates.templateNamePlaceholder",
                        )}
                        className="h-9 text-sm"
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
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("settings.mapTemplates.searchPlaceholder")}
                  className="h-9 text-sm"
                />

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
                              (selectedMap: MapTemplateResponseDtoMapsItem) =>
                                selectedMap.id === gameMap.id,
                            )}
                            onCheckedChange={(checked) =>
                              handleToggleMap(gameMap, checked === true)
                            }
                          />
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="flex-1 text-sm">{gameMap.name}</span>
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
