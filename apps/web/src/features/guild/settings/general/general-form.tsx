import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import { generateSlug } from "@/utils/generate-slug";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card } from "@lootlog/ui/components/card";
import { Link2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  invalidateGuildsControllerGetGuildById,
  useGuildsControllerGetGuildById,
  useGuildsControllerUpdateGuildConfig,
} from "@lootlog/api-client/react-query/main/guilds";
import {
  invalidateUsersControllerGetCurrentUserAccessibleGuilds,
  invalidateUsersControllerGetCurrentUserGuilds,
} from "@lootlog/api-client/react-query/main/users";
import {
  generalFormSchema,
  type GeneralFormValues,
} from "./general-form.schema";
import { StatsCardSettingsCard } from "./stats-card-settings-card";

const RESTRICTED_NAMES = ["@me"];

export const GeneralForm = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });
  const { mutate: updateGuildConfig } = useGuildsControllerUpdateGuildConfig();
  const navigate = useNavigate();

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    defaultValues: {
      vanityUrl: guild?.vanityUrl ?? "",
      publicStatsCardEnabled: guild?.publicStatsCardEnabled ?? false,
    },
  });

  useEffect(() => {
    if (guild) {
      form.reset({
        vanityUrl: guild.vanityUrl ?? "",
        publicStatsCardEnabled: guild.publicStatsCardEnabled,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guild?.vanityUrl, guild?.publicStatsCardEnabled]);

  function onSubmit(values: GeneralFormValues) {
    if (RESTRICTED_NAMES.includes(values.vanityUrl)) {
      toast.error(t("settings.general.vanityUrl.restricted"));
      return;
    }

    updateGuildConfig(
      {
        pathParams: { guildId: guildId ?? "" },
        data: {
          vanityUrl: values.vanityUrl.length > 0 ? values.vanityUrl : null,
          publicStatsCardEnabled: values.publicStatsCardEnabled,
        },
      },
      {
        onSuccess: async (data) => {
          if (guildId) {
            queryClient.setQueryData(
              getGuildsControllerGetGuildByIdQueryKey({ guildId }),
              data,
            );
            await Promise.all([
              invalidateGuildsControllerGetGuildById(queryClient, { guildId }),
              invalidateUsersControllerGetCurrentUserAccessibleGuilds(
                queryClient,
              ),
              invalidateUsersControllerGetCurrentUserGuilds(queryClient),
            ]);
          }
          toast.success(t("settings.general.toasts.updateSuccess"));
          navigate({ to: `/${data.vanityUrl ?? data.id}/settings` as string });
          form.reset({
            vanityUrl: data.vanityUrl ?? "",
            publicStatsCardEnabled: data.publicStatsCardEnabled,
          });
        },
        onError: () => {
          toast.error(t("settings.general.toasts.updateError"));
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full mx-auto pb-24"
      >
        <div className="p-3">
          <Card className="bg-card/50 backdrop-blur-sm border-border p-0 gap-0">
            <div className="p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Link2 className="size-4 text-primary" />
                </div>
                <div>
                  <FormLabel className="text-sm font-semibold">
                    {t("settings.general.vanityUrl.title")}
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.general.vanityUrl.description")}
                  </p>
                </div>
              </div>

              <div className="ml-11">
                <FormField
                  control={form.control}
                  name="vanityUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "settings.general.vanityUrl.placeholder",
                          )}
                          className="h-9 max-w-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs mt-2">
                        {t("settings.general.vanityUrl.example")}{" "}
                        <span className="text-foreground font-medium">
                          {window.location.origin}/
                          {generateSlug(field.value) ||
                            t("settings.general.vanityUrl.exampleSlug")}
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>
        </div>

        {guild && (
          <div className="p-3 pt-0">
            <StatsCardSettingsCard form={form} guild={guild} />
          </div>
        )}

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={form.formState.isSubmitting}
          onReset={() => form.reset()}
        />
      </form>
    </Form>
  );
};
