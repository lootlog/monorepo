import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import { Spinner } from "@lootlog/ui/components/spinner";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MultiSelect } from "@/components/ui/multi-select";
import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user-notifications/constants/user-watched-items-limit";
import { WatchedItemSelector } from "@/features/user-notifications/components/watched-item-selector";
import { getUserNotificationsErrorMessage } from "@/features/user-notifications/utils/get-user-notifications-error-message";
import { useItems, type GameItem } from "@/hooks/api/game-data/use-items";
import { useGuildsWorlds } from "@/hooks/api/game-data/use-guilds-worlds";
import { useCreateWatchedItem } from "@/hooks/api/user/use-create-watched-item";
import type { UserWatchedItem } from "@/hooks/api/user/use-user-notifications";

const watchFormSchema = z
  .object({
    guildIds: z.array(z.string()).min(1),
    world: z.string().min(1),
    manualEntry: z.boolean(),
    item: z
      .object({
        id: z.number(),
        name: z.string(),
        icon: z.string(),
        lvl: z.number(),
        rarity: z.string().nullable(),
      })
      .nullable(),
    manualItemId: z.string(),
    manualItemName: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.manualEntry) {
      if (!data.manualItemId.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manualItemId"],
          message: "manualItemIdRequired",
        });
      } else if (!/^\d+$/.test(data.manualItemId.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manualItemId"],
          message: "manualItemIdInvalid",
        });
      }
      if (!data.manualItemName.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manualItemName"],
          message: "manualItemNameRequired",
        });
      }
    } else {
      if (!data.item) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["item"],
          message: "itemRequired",
        });
      }
    }
  });

type WatchFormValues = z.infer<typeof watchFormSchema>;

type WatchFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasActiveDm: boolean;
  watchedItems: UserWatchedItem[];
  guildOptions: Array<{ value: string; label: string }>;
};

export const WatchFormDialog = ({
  open,
  onOpenChange,
  hasActiveDm,
  watchedItems,
  guildOptions,
}: WatchFormDialogProps) => {
  const { t } = useTranslation();
  const createWatchedItem = useCreateWatchedItem();
  const [itemSearchValue, setItemSearchValue] = useState("");

  const form = useForm<WatchFormValues>({
    resolver: zodResolver(watchFormSchema),
    defaultValues: {
      guildIds: [],
      world: "",
      manualEntry: false,
      item: null,
      manualItemId: "",
      manualItemName: "",
    },
  });

  const selectedGuildIds = form.watch("guildIds");
  const selectedWorld = form.watch("world");
  const selectedItem = form.watch("item");
  const isManualEntry = form.watch("manualEntry");

  const { worlds: worldOptions } = useGuildsWorlds(selectedGuildIds);
  const { data: itemSearchResults = [], isFetching: isItemsLoading } = useItems(
    {
      search: itemSearchValue,
      world: selectedWorld || undefined,
      limit: 10,
    },
  );

  const resolvedItemId = isManualEntry
    ? Number(form.watch("manualItemId")) || null
    : (selectedItem?.id ?? null);

  const watchedItemsCount = watchedItems.length;
  const hasSelectedItemWatched =
    resolvedItemId !== null &&
    selectedWorld.length > 0 &&
    watchedItems.some(
      (watchedItem) =>
        watchedItem.itemId === resolvedItemId &&
        watchedItem.world === selectedWorld,
    );
  const isWatchedItemLimitReached =
    watchedItemsCount >= USER_WATCHED_ITEMS_LIMIT && !hasSelectedItemWatched;

  useEffect(() => {
    if (selectedWorld && !worldOptions.includes(selectedWorld)) {
      form.setValue("world", "");
    }
  }, [selectedWorld, worldOptions, form]);

  useEffect(() => {
    form.setValue("item", null);
    setItemSearchValue("");
  }, [selectedWorld, form]);

  useEffect(() => {
    if (!open) {
      form.reset();
      setItemSearchValue("");
    }
  }, [open, form]);

  const handleCreateWatchedItem = async (values: WatchFormValues) => {
    if (!hasActiveDm) {
      toast.error(t("settings.userNotifications.validation.dmRequired"));
      return;
    }

    let itemId: number;
    let itemName: string;

    if (values.manualEntry) {
      itemId = Number(values.manualItemId.trim());
      itemName = values.manualItemName.trim();
    } else {
      if (!values.item) return;
      itemId = values.item.id;
      itemName = values.item.name;
    }

    const hasMatchingWatchedItem = watchedItems.some(
      (watchedItem) =>
        watchedItem.itemId === itemId && watchedItem.world === values.world,
    );
    const nextWatchedItemsCount = hasMatchingWatchedItem
      ? watchedItemsCount
      : Math.min(watchedItemsCount + 1, USER_WATCHED_ITEMS_LIMIT);

    if (
      watchedItemsCount >= USER_WATCHED_ITEMS_LIMIT &&
      !hasMatchingWatchedItem
    ) {
      toast.error(
        t("settings.userNotifications.validation.watchLimitReached", {
          limit: USER_WATCHED_ITEMS_LIMIT,
        }),
      );
      return;
    }

    const loadingToastId = toast.loading(
      t("settings.userNotifications.toasts.watchCreating", {
        count: nextWatchedItemsCount,
        limit: USER_WATCHED_ITEMS_LIMIT,
      }),
    );

    try {
      await createWatchedItem.mutateAsync({
        itemId,
        itemName,
        world: values.world,
        guildIds: values.guildIds,
      });
      toast.success(
        t("settings.userNotifications.toasts.watchCreated", {
          count: nextWatchedItemsCount,
          limit: USER_WATCHED_ITEMS_LIMIT,
        }),
        { id: loadingToastId },
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        getUserNotificationsErrorMessage(error, t) ??
          t("settings.userNotifications.toasts.watchCreateError"),
        { id: loadingToastId },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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
                    <FormControl>
                      <MultiSelect
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
                    </FormControl>
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
                    <FormControl>
                      <WorldSwitcher
                        worlds={worldOptions}
                        value={field.value || null}
                        onValueChange={(world) => field.onChange(world ?? "")}
                        width="w-full"
                      />
                    </FormControl>
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
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!selectedWorld}
                            placeholder={t(
                              "settings.userNotifications.manualEntry.itemIdPlaceholder",
                            )}
                          />
                        </FormControl>
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
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!selectedWorld}
                            placeholder={t(
                              "settings.userNotifications.manualEntry.itemNamePlaceholder",
                            )}
                          />
                        </FormControl>
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
                      <FormControl>
                        <WatchedItemSelector
                          disabled={!selectedWorld}
                          loading={isItemsLoading}
                          items={itemSearchResults}
                          searchValue={itemSearchValue}
                          selectedItem={field.value as GameItem | null}
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
                      </FormControl>
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
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
                  {t(
                    "settings.userNotifications.validation.watchLimitReached",
                    {
                      limit: USER_WATCHED_ITEMS_LIMIT,
                    },
                  )}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={
                createWatchedItem.isPending ||
                !hasActiveDm ||
                isWatchedItemLimitReached
              }
            >
              {createWatchedItem.isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  {t("settings.userNotifications.actions.addingWatch")}
                </span>
              ) : (
                t("settings.userNotifications.actions.addWatch")
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
