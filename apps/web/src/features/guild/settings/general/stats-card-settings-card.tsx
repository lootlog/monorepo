import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Eye, ImageOff, RefreshCw } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@lootlog/ui/components/form";
import { Switch } from "@lootlog/ui/components/switch";
import { API_URL } from "@/config/api";
import { useAuthenticatedGuildStatsCardControllerRefreshStatsCard } from "@lootlog/api-client/react-query/main/guild-stats-card";
import type { GuildResponseDto } from "@lootlog/api-client/models/main/guild-response-dto";
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
  const [imageError, setImageError] = useState(false);
  const refreshStatsCard =
    useAuthenticatedGuildStatsCardControllerRefreshStatsCard();
  const enabledValue = form.watch("publicStatsCardEnabled");
  const savedEnabled = guild.publicStatsCardEnabled;
  const imageUrl = `${API_URL}/public/guilds/${guild.id}/stats-card.png`;
  const previewUrl = `${imageUrl}?preview=${previewToken}`;
  const needsSaveBeforePreview = enabledValue && !savedEnabled;

  const handleCopyLink = async () => {
    if (!savedEnabled) {
      return;
    }

    try {
      const copied = await copyToClipboard(imageUrl);

      if (copied) {
        toast.success(t("settings.general.statsCard.copySuccess"));
        return;
      }

      toast.error(t("settings.general.statsCard.copyError"));
    } catch {
      toast.error(t("settings.general.statsCard.copyError"));
    }
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
    <Card className="bg-card  border-border p-0 gap-0">
      <div className="p-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Eye className="size-4 text-primary" />
            </div>
            <div>
              <FormLabel className="text-sm font-semibold">
                {t("settings.general.statsCard.title")}
              </FormLabel>
              <p className="text-xs text-muted-foreground">
                {t("settings.general.statsCard.description")}
              </p>
            </div>
          </div>
          <FormField
            control={form.control}
            name="publicStatsCardEnabled"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label={t("settings.general.statsCard.toggleLabel")}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="ml-11 space-y-3">
          <FormDescription className="text-xs">
            {t("settings.general.statsCard.toggleDescription")}
          </FormDescription>

          <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-background">
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
              onClick={handleCopyLink}
            >
              <Copy className="size-4" />
              {t("settings.general.statsCard.copyLink")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!savedEnabled || refreshStatsCard.isPending}
              onClick={handleRefresh}
            >
              <RefreshCw
                className={
                  refreshStatsCard.isPending ? "size-4 animate-spin" : "size-4"
                }
              />
              {t("settings.general.statsCard.refresh")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("settings.general.statsCard.refreshHint")}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
