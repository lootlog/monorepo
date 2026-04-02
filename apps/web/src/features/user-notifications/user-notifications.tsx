import { useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  BellRing,
  FlaskConical,
  MessageCircleMore,
  Package,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Spinner } from "@lootlog/ui/components/spinner";
import { MultiSelect } from "@/components/ui/multi-select";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import { WatchedItemCard } from "@/features/user-notifications/components/watched-item-card";
import { WatchedItemSelector } from "@/features/user-notifications/components/watched-item-selector";
import { useItems, type GameItem } from "@/hooks/api/game-data/use-items";
import { useGuilds } from "@/hooks/api/guilds/use-guilds";
import {
  useCreateUserNotificationTarget,
  useCreateWatchedItem,
  useTriggerUserNotificationTargetTest,
  useUpdateUserNotificationTarget,
  useUserNotifications,
} from "@/hooks/api/user/use-user-notifications";
import { apiClient } from "@/lib/api-client/api-client";

const getWatchedItemGuildIds = (filters: { guildIds?: string[] } | null) =>
  filters?.guildIds ?? [];

export const UserNotifications = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useUserNotifications();
  const { data: guilds = [] } = useGuilds();
  const createUserTarget = useCreateUserNotificationTarget();
  const updateUserTarget = useUpdateUserNotificationTarget();
  const triggerUserTargetTest = useTriggerUserNotificationTargetTest();
  const createWatchedItem = useCreateWatchedItem();
  const [selectedGuildIds, setSelectedGuildIds] = useState<string[]>([]);
  const [selectedWorld, setSelectedWorld] = useState("");
  const [itemSearchValue, setItemSearchValue] = useState("");
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(null);
  const dmTarget =
    data?.targets.find((target) => target.targetType === "DM") ?? null;
  const hasDmTarget = dmTarget !== null;
  const hasActiveDm = Boolean(dmTarget?.active && dmTarget.canSend);
  const isDmActionPending =
    createUserTarget.isPending ||
    updateUserTarget.isPending ||
    triggerUserTargetTest.isPending;
  const guildOptions = guilds.map((guild) => ({
    value: guild.id,
    label: guild.name,
  }));
  const guildWorldQueries = useQueries({
    queries: selectedGuildIds.map((guildId) => ({
      queryKey: ["notifications-guild-worlds", guildId],
      queryFn: async () => {
        const response = await apiClient.get<string[]>(
          `/guilds/${guildId}/worlds`,
        );
        return response.data;
      },
      enabled: selectedGuildIds.length > 0,
    })),
  });
  const worldOptions = [
    ...new Set(guildWorldQueries.flatMap((query) => query.data ?? [])),
  ].sort();
  const areGuildWorldsLoading = guildWorldQueries.some(
    (query) => query.isLoading,
  );
  const { data: itemSearchResults = [], isFetching: isItemsLoading } = useItems(
    {
      search: itemSearchValue,
      world: selectedWorld || undefined,
      limit: 10,
    },
  );

  useEffect(() => {
    if (selectedWorld && !worldOptions.includes(selectedWorld)) {
      setSelectedWorld("");
    }
  }, [selectedWorld, worldOptions]);

  useEffect(() => {
    setSelectedItem(null);
    setItemSearchValue("");
  }, [selectedWorld]);

  const handleEnableDm = async () => {
    try {
      if (dmTarget) {
        await updateUserTarget.mutateAsync({
          targetId: dmTarget.id,
          active: true,
        });
      } else {
        await createUserTarget.mutateAsync({});
      }

      toast.success(t("settings.userNotifications.toasts.dmEnabled"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.userNotifications.toasts.dmEnableError"),
      );
    }
  };

  const handleCreateWatchedItem = async () => {
    if (!hasActiveDm) {
      toast.error(t("settings.userNotifications.validation.dmRequired"));
      return;
    }

    if (selectedGuildIds.length === 0) {
      toast.error(t("settings.userNotifications.validation.guildRequired"));
      return;
    }

    if (!selectedWorld) {
      toast.error(t("settings.notifications.validation.worldRequired"));
      return;
    }

    if (!selectedItem) {
      toast.error(t("settings.userNotifications.validation.itemRequired"));
      return;
    }

    try {
      await createWatchedItem.mutateAsync({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        itemIcon: selectedItem.icon,
        world: selectedWorld,
        guildIds: selectedGuildIds,
      });
      toast.success(t("settings.userNotifications.toasts.watchCreated"));
      setSelectedItem(null);
      setItemSearchValue("");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.userNotifications.toasts.watchCreateError"),
      );
    }
  };

  const handleTriggerDmTest = async () => {
    if (!dmTarget || !hasActiveDm) {
      return;
    }

    try {
      await triggerUserTargetTest.mutateAsync({
        targetId: dmTarget.id,
      });
      toast.success(t("settings.userNotifications.toasts.dmTestTriggered"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.userNotifications.toasts.dmTestTriggerError"),
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background/50">
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 py-3">
          <Card className="gap-4 border-border bg-card/60 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2.5 shadow-inner shadow-blue-500/10">
                <BellRing className="size-4 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold leading-tight">
                  {t("settings.userNotifications.title")}
                </h2>
                <p className="text-xs leading-tight text-muted-foreground">
                  {t("settings.userNotifications.description")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                <MessageCircleMore className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">
                    {t("settings.userNotifications.dm.title")}
                  </h3>
                  <Badge variant={hasActiveDm ? "default" : "secondary"}>
                    {hasActiveDm
                      ? t("settings.userNotifications.dm.active")
                      : t("settings.userNotifications.dm.actionRequired")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("settings.userNotifications.dm.description")}
                </p>
                {dmTarget?.displayName ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("settings.userNotifications.dm.targetLabel", {
                      name: dmTarget.displayName,
                    })}
                  </p>
                ) : null}
                {!hasActiveDm ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-500">
                    <ShieldAlert className="size-3.5 shrink-0" />
                    {hasDmTarget && !dmTarget.canSend
                      ? t("settings.userNotifications.dm.cannotSendHint")
                      : hasDmTarget
                        ? t("settings.userNotifications.dm.reactivateHint")
                        : t("settings.userNotifications.dm.requiredHint")}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                {hasActiveDm ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isDmActionPending}
                    onClick={handleTriggerDmTest}
                  >
                    <FlaskConical className="size-4" />
                    {t("settings.userNotifications.dm.test")}
                  </Button>
                ) : null}
                {!hasActiveDm ? (
                  <Button
                    size="sm"
                    disabled={isDmActionPending}
                    onClick={handleEnableDm}
                  >
                    {t("settings.userNotifications.dm.configure")}
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2.5 shadow-inner shadow-emerald-500/10">
                    <Package className="size-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">
                      {t("settings.userNotifications.watchForm.title")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.userNotifications.watchForm.description")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.userNotifications.fields.guilds")}
                    </p>
                    <MultiSelect
                      options={guildOptions}
                      value={selectedGuildIds}
                      onValueChange={setSelectedGuildIds}
                      onClose={setSelectedGuildIds}
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
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.notifications.fields.world")}
                    </p>
                    <Select
                      value={selectedWorld}
                      onValueChange={setSelectedWorld}
                      disabled={
                        selectedGuildIds.length === 0 || areGuildWorldsLoading
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            areGuildWorldsLoading
                              ? t("settings.userNotifications.loading.worlds")
                              : t(
                                  "settings.userNotifications.placeholders.world",
                                )
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {worldOptions.map((world) => (
                          <SelectItem key={world} value={world}>
                            {world}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("settings.userNotifications.fields.item")}
                    </p>
                    <WatchedItemSelector
                      disabled={!selectedWorld}
                      loading={isItemsLoading}
                      items={itemSearchResults}
                      searchValue={itemSearchValue}
                      selectedItem={selectedItem}
                      placeholder={t(
                        "settings.userNotifications.placeholders.item",
                      )}
                      searchPlaceholder={t(
                        "settings.userNotifications.placeholders.searchItems",
                      )}
                      emptyMessage={t("settings.userNotifications.empty.items")}
                      loadingMessage={t(
                        "settings.userNotifications.loading.items",
                      )}
                      disabledMessage={t(
                        "settings.userNotifications.validation.worldRequired",
                      )}
                      onSearchChange={setItemSearchValue}
                      onSelect={setSelectedItem}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t("settings.userNotifications.watchForm.footer")}
                  </p>
                  <Button
                    size="sm"
                    disabled={createWatchedItem.isPending || !hasActiveDm}
                    onClick={handleCreateWatchedItem}
                  >
                    {t("settings.userNotifications.actions.addWatch")}
                  </Button>
                </div>
              </Card>

              <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500/10 p-2.5 shadow-inner shadow-amber-500/10">
                    <BellRing className="size-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">
                      {t("settings.userNotifications.watchList.title")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.userNotifications.watchList.description")}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {t("settings.userNotifications.watchCount", {
                      count: data?.watchedItems.length ?? 0,
                    })}
                  </Badge>
                </div>
                {(data?.watchedItems.length ?? 0) > 0 ? (
                  <div className="flex flex-col gap-3">
                    {data?.watchedItems.map((watchedItem) => {
                      const selectedGuildIdsForItem = getWatchedItemGuildIds(
                        watchedItem.notificationRule?.filters ?? null,
                      );
                      const guildLabels = selectedGuildIdsForItem
                        .map(
                          (guildId) =>
                            guilds.find((guild) => guild.id === guildId)?.name,
                        )
                        .filter((label): label is string => Boolean(label));
                      const missingGuildIds = selectedGuildIdsForItem.filter(
                        (guildId) =>
                          !guilds.some((guild) => guild.id === guildId),
                      );

                      return (
                        <WatchedItemCard
                          key={watchedItem.id}
                          watchedItem={watchedItem}
                          guildLabels={guildLabels}
                          missingGuildIds={missingGuildIds}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
                    {t("settings.userNotifications.empty.watchedItems")}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-blue-500/10 p-2.5 shadow-inner shadow-blue-500/10">
                    <ShieldAlert className="size-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">
                      {t("settings.userNotifications.scopeInfo.title")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.userNotifications.scopeInfo.description")}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
