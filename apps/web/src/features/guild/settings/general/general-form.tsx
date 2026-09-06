import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { getGuildSettingsErrorMessage } from "../get-guild-settings-error-message";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import { generateSlug } from "@/utils/generate-slug";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

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
} from "@lootlog/client/main";
import {
  invalidateUsersControllerGetCurrentUserAccessibleGuilds,
  invalidateUsersControllerGetCurrentUserGuilds,
} from "@lootlog/client/main";
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
  const { mutate: updateGuildConfig, isPending } =
    useGuildsControllerUpdateGuildConfig();
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
    if (isPending) return;

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
        onError: (error) => {
          toast.error(
            getGuildSettingsErrorMessage(error, t) ??
              t("settings.general.toasts.updateError"),
          );
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
          <SectionCard>
            <SectionCardHeader
              title={t("settings.general.vanityUrl.title")}
              description={t("settings.general.vanityUrl.description")}
              icon={Link2}
            />
            <SectionCardContent>
              <div>
                <FormField
                  control={form.control}
                  name="vanityUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl
                        render={
                          <Input
                            placeholder={t(
                              "settings.general.vanityUrl.placeholder",
                            )}
                            className="h-9 max-w-xs"
                            {...field}
                          />
                        }
                      />
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
            </SectionCardContent>
          </SectionCard>
        </div>

        {guild && (
          <div className="p-3 pt-0">
            <StatsCardSettingsCard form={form} guild={guild} />
          </div>
        )}

        <UnsavedChangesBar
          isDirty={form.formState.isDirty}
          isSubmitting={isPending}
          onReset={() => form.reset()}
        />
      </form>
    </Form>
  );
};
