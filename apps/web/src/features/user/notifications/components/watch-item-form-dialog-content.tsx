import { useWatchItemForm } from "./use-watch-item-form";

import { Info } from "lucide-react";

import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { DialogHeader, DialogTitle } from "@lootlog/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MultiSelect } from "@/components/ui/multi-select";
import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user/notifications/constants/user-watched-items-limit";
import { WatchedItemSelector } from "@/features/user/notifications/components/watched-item-selector";

import type { WatchedItemResponseDto } from "@lootlog/client/main";

type WatchFormDialogContentProps = {
  onOpenChange: (open: boolean) => void;
  hasActiveDm: boolean;
  watchedItems: WatchedItemResponseDto[];
  guildOptions: Array<{ value: string; label: string }>;
};

export const WatchFormDialogContent = ({
  onOpenChange,
  hasActiveDm,
  watchedItems,
  guildOptions,
}: WatchFormDialogContentProps) => {
  const {
    t,
    form,
    selectedWorld,
    isManualEntry,
    worldOptions,
    isItemsLoading,
    itemSearchQuery,
    itemSearchResults,
    itemSearchValue,
    setItemSearchValue,
    watchedItemsCount,
    isWatchedItemLimitReached,
    createWatchedItem,
    handleCreateWatchedItem,
    handleWorldChange,
  } = useWatchItemForm({ hasActiveDm, watchedItems, onOpenChange });

  return (
    <>
      <DialogHeader className="px-1 pb-4">
        <DialogTitle>
          {t("settings.userNotifications.watchForm.title")}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleCreateWatchedItem)}
          className="flex flex-col gap-4 p-4"
        >
          <div className="space-y-3">
            <FormField
              control={form.control}
              name="guildIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.userNotifications.fields.guilds")}
                  </FormLabel>
                  <FormControl
                    render=<MultiSelect
                      options={guildOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      onClose={field.onChange}
                      placeholder={t(
                        "settings.userNotifications.placeholders.guilds",
                      )}
                      searchPlaceholder={t(
                        "settings.userNotifications.placeholders.searchGuilds",
                      )}
                      emptyMessage={t(
                        "settings.userNotifications.empty.guilds",
                      )}
                      commandSearch
                    />
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="world"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.notifications.fields.world")}
                  </FormLabel>
                  <FormControl
                    render=<WorldSwitcher
                      worlds={worldOptions}
                      value={field.value || null}
                      onValueChange={handleWorldChange}
                      width="w-full"
                    />
                  />
                </FormItem>
              )}
            />

            {isManualEntry ? (
              <>
                <FormField
                  control={form.control}
                  name="manualItemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.userNotifications.manualEntry.itemId")}
                      </FormLabel>
                      <FormControl
                        render=<Input
                          {...field}
                          disabled={!selectedWorld}
                          placeholder={t(
                            "settings.userNotifications.manualEntry.itemIdPlaceholder",
                          )}
                        />
                      />
                      {form.formState.errors.manualItemId ? (
                        <p className="text-sm text-destructive">
                          {t(
                            `settings.userNotifications.validation.${form.formState.errors.manualItemId.message}`,
                          )}
                        </p>
                      ) : null}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manualItemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t("settings.userNotifications.manualEntry.itemName")}
                      </FormLabel>
                      <FormControl
                        render=<Input
                          {...field}
                          disabled={!selectedWorld}
                          placeholder={t(
                            "settings.userNotifications.manualEntry.itemNamePlaceholder",
                          )}
                        />
                      />
                      {form.formState.errors.manualItemName ? (
                        <p className="text-sm text-destructive">
                          {t(
                            `settings.userNotifications.validation.${form.formState.errors.manualItemName.message}`,
                          )}
                        </p>
                      ) : null}
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="item"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.userNotifications.fields.item")}
                    </FormLabel>
                    <FormControl
                      render=<WatchedItemSelector
                        disabled={!selectedWorld}
                        loading={isItemsLoading}
                        errorMessage={
                          itemSearchQuery.isError
                            ? t("common.searchUnavailable")
                            : undefined
                        }
                        items={itemSearchResults}
                        searchValue={itemSearchValue}
                        selectedItem={field.value}
                        placeholder={t(
                          "settings.userNotifications.placeholders.item",
                        )}
                        searchPlaceholder={t(
                          "settings.userNotifications.placeholders.searchItems",
                        )}
                        emptyMessage={t(
                          "settings.userNotifications.empty.items",
                        )}
                        loadingMessage={t(
                          "settings.userNotifications.loading.items",
                        )}
                        disabledMessage={t(
                          "settings.userNotifications.validation.worldRequired",
                        )}
                        onSearchChange={setItemSearchValue}
                        onSelect={field.onChange}
                      />
                    />
                    {form.formState.errors.item ? (
                      <p className="text-sm text-destructive">
                        {t(
                          `settings.userNotifications.validation.${form.formState.errors.item.message}`,
                        )}
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="manualEntry"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl
                    render=<Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  />
                  <FormLabel className="!mt-0 text-xs text-muted-foreground">
                    {t("settings.userNotifications.manualEntry.checkbox")}
                  </FormLabel>
                </FormItem>
              )}
            />

            {isManualEntry ? (
              <div className="flex items-start gap-2 rounded-md bg-blue-500/10 px-3 py-2">
                <Info className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("settings.userNotifications.manualEntry.hint")}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {t("settings.userNotifications.watchForm.footer")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.userNotifications.watchForm.limitStatus", {
                count: watchedItemsCount,
                limit: USER_WATCHED_ITEMS_LIMIT,
              })}
            </p>
            {isWatchedItemLimitReached ? (
              <p className="text-xs text-destructive">
                {t("settings.userNotifications.validation.watchLimitReached", {
                  limit: USER_WATCHED_ITEMS_LIMIT,
                })}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="sm"
            loading={createWatchedItem.isPending}
            disabled={
              createWatchedItem.isPending ||
              !hasActiveDm ||
              isWatchedItemLimitReached
            }
          >
            {t("settings.userNotifications.actions.addWatch")}
          </Button>
        </form>
      </Form>
    </>
  );
};
