import { BandSection } from "@/components/common/band-section";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, ImageOff, RefreshCw } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@lootlog/ui/components/button";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@lootlog/ui/components/form";
import { Switch } from "@lootlog/ui/components/switch";
import { API_URL } from "@/config/api";
import {
  useAuthenticatedGuildStatsCardControllerRefreshStatsCard,
  type GuildResponseDtoOutput,
} from "@lootlog/client/main";

import type { GeneralFormValues } from "./general-form.schema";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

type StatsCardSettingsSectionProps = {
  form: UseFormReturn<GeneralFormValues>;
  guild: GuildResponseDtoOutput;
};

export const StatsCardSettingsSection = ({
  form,
  guild,
}: StatsCardSettingsSectionProps) => {
  const { t } = useTranslation();
  const [, copyToClipboard] = useCopyToClipboard();
  const [previewToken, setPreviewToken] = useState(() => Date.now());
  const [isCopying, setIsCopying] = useState(false);
  const [imageError, setImageError] = useState(false);

  const refreshStatsCard =
    useAuthenticatedGuildStatsCardControllerRefreshStatsCard();

  const enabledValue = form.watch("publicStatsCardEnabled");
  const savedEnabled = guild.publicStatsCardEnabled;
  const imageUrl = `${API_URL}/public/guilds/${guild.id}/stats-card.png`;
  const previewUrl = `${imageUrl}?preview=${previewToken}`;
  const needsSaveBeforePreview = enabledValue && !savedEnabled;

  const handleCopyLink = () => {
    if (!savedEnabled || isCopying) return;

    setIsCopying(true);

    return Promise.resolve()
      .then(() => copyToClipboard(imageUrl))
      .then((copied) => {
        if (copied) {
          toast.success(t("settings.general.statsCard.copySuccess"));

          return;
        }

        toast.error(t("settings.general.statsCard.copyError"));
      })
      .catch(() => {
        toast.error(t("settings.general.statsCard.copyError"));
      })
      .finally(() => setIsCopying(false));
  };

  const handleRefresh = () => {
    if (!savedEnabled) {
      return;
    }

    refreshStatsCard.mutate(
      {
        pathParams: {
          guildId: guild.id,
        },
      },
      {
        onSuccess: () => {
          setImageError(false);
          setPreviewToken(Date.now());
          toast.success(t("settings.general.statsCard.refreshSuccess"));
        },
        onError: (error) => {
          if (error.status === 429) {
            toast.error(t("settings.general.statsCard.refreshRateLimited"));

            return;
          }

          toast.error(t("settings.general.statsCard.refreshError"));
        },
      },
    );
  };

  return (
    <BandSection
      id="settings-stats-card"
      title={t("settings.general.statsCard.title")}
      description={t("settings.general.statsCard.description")}
    >
      <FormField
        control={form.control}
        name="publicStatsCardEnabled"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <FormLabel>
                {t("settings.general.statsCard.toggleLabel")}
              </FormLabel>
              <FormDescription className="text-xs">
                {t("settings.general.statsCard.toggleDescription")}
              </FormDescription>
            </div>
            <FormControl
              render=<Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            />
          </FormItem>
        )}
      />

      <div className="flex flex-col gap-3">
        <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border">
          {savedEnabled && !imageError ? (
            <img
              src={previewUrl}
              alt={t("settings.general.statsCard.previewAlt")}
              className="aspect-[1200/630] w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex aspect-[1200/630] w-full flex-col items-center justify-center gap-2 p-6 text-center">
              <ImageOff className="size-7 text-muted-foreground" />
              <p className="text-sm font-medium">
                {needsSaveBeforePreview
                  ? t("settings.general.statsCard.saveToEnablePreview")
                  : t("settings.general.statsCard.disabledPreview")}
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {imageError
                  ? t("settings.general.statsCard.previewError")
                  : t("settings.general.statsCard.disabledPreviewDescription")}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!savedEnabled}
            loading={isCopying}
            icon=<Copy className="size-4" />
            onClick={handleCopyLink}
          >
            {t("settings.general.statsCard.copyLink")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!savedEnabled || refreshStatsCard.isPending}
            loading={refreshStatsCard.isPending}
            icon=<RefreshCw className="size-4" />
            onClick={handleRefresh}
          >
            {t("settings.general.statsCard.refresh")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("settings.general.statsCard.refreshHint")}
          </p>
        </div>
      </div>
    </BandSection>
  );
};
