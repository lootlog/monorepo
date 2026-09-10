import { invalidateUserNotificationQueries } from "@/features/user/notifications/utils/invalidate-user-notification-queries";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";

import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user/notifications/constants/user-watched-items-limit";
import { getUserNotificationsErrorMessage } from "@/features/user/notifications/utils/get-user-notifications-error-message";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetWorldsByGuildIdQueryOptions,
  useNotificationsUserControllerCreateWatchedItem,
  type WatchedItemResponseDto,
} from "@lootlog/client/main";

import {
  getItemsControllerGetItemsQueryKey,
  useItemsControllerGetItems,
} from "@lootlog/client/search";

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

export function useWatchItemForm({
  hasActiveDm,
  watchedItems,
  onOpenChange,
}: {
  hasActiveDm: boolean;
  watchedItems: WatchedItemResponseDto[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createWatchedItem = useNotificationsUserControllerCreateWatchedItem({
    mutation: {
      onSuccess: async () => {
        await invalidateUserNotificationQueries(queryClient);
      },
    },
  });
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

  const worldQueries = useQueries({
    queries: selectedGuildIds.map((guildId) =>
      getGuildsControllerGetWorldsByGuildIdQueryOptions({ guildId }),
    ),
  });
  const worldOptions = [
    ...new Set(worldQueries.flatMap((query) => query.data ?? [])),
  ].sort();
  const itemSearchParams = {
    limit: 10,
    search: itemSearchValue,
    world: selectedWorld || undefined,
  };
  const itemSearchQuery = useItemsControllerGetItems(itemSearchParams, {
    query: {
      queryKey: getItemsControllerGetItemsQueryKey(itemSearchParams),
      enabled: itemSearchValue.length >= 2,
    },
  });
  const itemSearchResults = itemSearchQuery.data?.hits ?? [];
  const isItemsLoading = itemSearchQuery.isFetching;

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

  const handleWorldChange = (world: string | null) => {
    form.setValue("world", world ?? "");
    form.setValue("item", null);
    setItemSearchValue("");
  };

  useEffect(() => {
    if (
      selectedWorld &&
      worldQueries.every((query) => query.isSuccess) &&
      !worldOptions.includes(selectedWorld)
    ) {
      form.setValue("world", "");
      form.setValue("item", null);
      setItemSearchValue("");
    }
  }, [selectedWorld, worldOptions, worldQueries, form]);

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
        data: {
          itemId,
          itemName,
          world: values.world,
          guildIds: values.guildIds,
        },
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

  return {
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
  };
}
