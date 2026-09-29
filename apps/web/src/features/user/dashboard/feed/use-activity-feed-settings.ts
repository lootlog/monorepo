import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerPatchPreferences,
  useSettingsDocumentsControllerGetPreferences,
  type SettingsDocumentsResponseDtoOutput,
} from "@lootlog/client/main";
import {
  parseActivityFeedSettings,
  type ActivityFeedSettings,
} from "@lootlog/domain/activity-feed";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUserPreferences } from "@/hooks/api/user/use-user-preferences";

const params = { domains: "general" };

const MUTATION_KEY = ["activityFeedSettings"];

const readSettings = (data: SettingsDocumentsResponseDtoOutput | undefined) =>
  parseActivityFeedSettings(data?.domains.general?.effective.activityFeed);

const withSettings = (
  data: SettingsDocumentsResponseDtoOutput,
  settings: ActivityFeedSettings,
): SettingsDocumentsResponseDtoOutput => {
  const general = data.domains.general;

  if (!general) return data;

  return {
    ...data,
    domains: {
      ...data.domains,
      general: {
        ...general,
        effective: { ...general.effective, activityFeed: settings },
      },
    },
  };
};

/** Feed filters and pause state stored on the account. */
export function useActivityFeedSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = getSettingsDocumentsControllerGetPreferencesQueryKey(params);
  const { data: preferences } = useUserPreferences();

  const query = useSettingsDocumentsControllerGetPreferences(params, {
    query: { staleTime: 60_000, retry: false },
  });

  // A queued change applies its optimistic value before earlier saves answer,
  // so only the last pending save may replace the cached settings.
  const isLastSave = () =>
    queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1;

  const mutation = useMutation({
    mutationKey: MUTATION_KEY,
    scope: { id: "activity-feed-settings" },
    mutationFn: (patch: Partial<ActivityFeedSettings>) => {
      if (!preferences) throw new Error("User preferences are not loaded");

      return settingsDocumentsControllerPatchPreferences({
        operations: [
          {
            domain: "general",
            scope: { type: "USER", id: preferences.userId },
            set: Object.fromEntries(
              Object.entries(patch).map(([key, value]) => [
                `activityFeed.${key}`,
                Array.isArray(value) ? [...value] : value,
              ]),
            ),
            unset: [],
          },
        ],
      });
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<SettingsDocumentsResponseDtoOutput>(queryKey);

      if (previous)
        queryClient.setQueryData(
          queryKey,
          withSettings(previous, { ...readSettings(previous), ...patch }),
        );

      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous && isLastSave())
        queryClient.setQueryData(queryKey, context.previous);
      toast.error(t("statistics.feedSettingsError"));
    },
    onSuccess: (data) => {
      if (isLastSave()) queryClient.setQueryData(queryKey, data);
    },
  });

  return {
    settings: readSettings(query.data),
    /** Settings resolved, or unavailable and replaced by defaults. */
    isReady: query.isSuccess || query.isError,
    canSave: preferences !== undefined && query.isSuccess,
    update: (patch: Partial<ActivityFeedSettings>) => mutation.mutate(patch),
  };
}
