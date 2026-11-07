import { uniqBy } from "es-toolkit";
import { invalidateUserNotificationQueries } from "@/features/user/notifications/utils/invalidate-user-notification-queries";
import { useEffect, useState } from "react";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/components/sonner";
import { Schema } from "effect";

import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user/notifications/constants/user-watched-items-limit";
import { getUserNotificationsErrorMessage } from "@/features/user/notifications/utils/get-user-notifications-error-message";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetWorldsByGuildIdQueryOptions,
  useNotificationsUserControllerCreateWatchedItem,
  type WatchedItemResponseDto,
} from "@lootlog/client/main";

import { useCatalogControllerGetItems } from "@lootlog/client/catalog";

const WatchFormFields = Schema.Struct({
  guildIds: Schema.mutable(Schema.Array(Schema.String)),
  world: Schema.String,
  manualEntry: Schema.Boolean,
  item: Schema.NullOr(
    Schema.Struct({
      id: Schema.Finite,
      name: Schema.String,
      icon: Schema.String,
      lvl: Schema.Finite,
      rarity: Schema.NullOr(Schema.String),
    }),
  ),
  manualItemId: Schema.String,
  manualItemName: Schema.String,
});

type WatchFormValues = typeof WatchFormFields.Type;

// One filter reports the required fields together with the item rules, so a
// submit shows every problem at once.
const watchFormSchema = Schema.toStandardSchemaV1(
  WatchFormFields.check(
    Schema.makeFilter((data) => {
      const issues: Array<Schema.FilterIssue> = [];

      if (data.guildIds.length === 0) {
        issues.push({ path: ["guildIds"], issue: "guildIdsRequired" });
      }

      if (data.world.length === 0) {
        issues.push({ path: ["world"], issue: "worldRequired" });
      }

      if (data.manualEntry) {
        if (!data.manualItemId.trim()) {
          issues.push({
            path: ["manualItemId"],
            issue: "manualItemIdRequired",
          });
        } else if (!/^\d+$/.test(data.manualItemId.trim())) {
          issues.push({ path: ["manualItemId"], issue: "manualItemIdInvalid" });
        }

        if (!data.manualItemName.trim()) {
          issues.push({
            path: ["manualItemName"],
            issue: "manualItemNameRequired",
          });
        }
      } else if (!data.item) {
        issues.push({ path: ["item"], issue: "itemRequired" });
      }

      return issues;
    }),
  ),
);

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
    resolver: standardSchemaResolver(watchFormSchema),
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

  const itemSearchParams = { limit: 10, search: itemSearchValue };

  const itemSearchQuery = useCatalogControllerGetItems(itemSearchParams, {
    query: {
      enabled: itemSearchValue.length >= 2,
    },
  });

  // A watch covers the item id; hits for its other names or editions add
  // nothing, and the most relevant one names it as the player searched.
  const itemSearchResults = uniqBy(
    itemSearchQuery.data?.hits ?? [],
    (hit) => hit.id,
  );

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
