import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Eye, ImageOff, RefreshCw } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@lootlog/ui/components/button";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
} from "@lootlog/ui/components/form";
import { Switch } from "@lootlog/ui/components/switch";
import { API_URL } from "@/config/api";
import { useAuthenticatedGuildStatsCardControllerRefreshStatsCard } from "@lootlog/client/main";
import type { GuildResponseDto } from "@lootlog/client/main";
import type { GeneralFormValues } from "./general-form.schema";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

type StatsCardSettingsCardProps = {
  form: UseFormReturn<GeneralFormValues>;
  guild: GuildResponseDto;
};

export const StatsCardSettingsCard = ({
  form,
  guild,
}: StatsCardSettingsCardProps) => {
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
    <SectionCard>
      <SectionCardHeader
        title={t("settings.general.statsCard.title")}
        description={t("settings.general.statsCard.description")}
        icon={Eye}
        actions={
          <FormField
            control={form.control}
            name="publicStatsCardEnabled"
            render={({ field }) => (
              <FormItem>
                <FormControl
                  render={
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t("settings.general.statsCard.toggleLabel")}
                    />
                  }
                />
              </FormItem>
            )}
          />
        }
      />
      <SectionCardContent>
        <div className=" space-y-3">
          <FormDescription className="text-xs">
            {t("settings.general.statsCard.toggleDescription")}
          </FormDescription>

          <div className="w-full max-w-xl overflow-hidden">
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
                    : t(
                        "settings.general.statsCard.disabledPreviewDescription",
                      )}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!savedEnabled}
              loading={isCopying}
              icon={<Copy className="size-4" />}
              onClick={handleCopyLink}
            >
              {t("settings.general.statsCard.copyLink")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!savedEnabled || refreshStatsCard.isPending}
              loading={refreshStatsCard.isPending}
              icon={<RefreshCw className="size-4" />}
              onClick={handleRefresh}
            >
              {t("settings.general.statsCard.refresh")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("settings.general.statsCard.refreshHint")}
            </p>
          </div>
        </div>
      </SectionCardContent>
    </SectionCard>
  );
};
