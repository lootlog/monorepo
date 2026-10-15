import { BandSection } from "@/components/common/band-section";
import { CopyLinkField } from "@/components/common/copy-link-field";
import { ROUTES } from "@/config/routes";
import {
  useShareUserTheme,
  useUnshareUserTheme,
} from "@/hooks/api/user/use-user-themes";
import type { UserThemeResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Link2, Link2Off } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/** Turns the theme's share link on and off, and hands it on. */
export const ThemeShareSection = ({
  theme,
}: {
  theme: UserThemeResponseDto;
}) => {
  const { t } = useTranslation();
  const share = useShareUserTheme();
  const unshare = useUnshareUserTheme();
  const isPending = share.isPending || unshare.isPending;

  const onError = () =>
    toast.error(t("settings.appearance.editor.share.error"));

  return (
    <BandSection
      id="theme-editor-share"
      title={t("settings.appearance.editor.share.title")}
      description={t("settings.appearance.editor.share.description")}
    >
      {theme.shareToken ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <CopyLinkField
            url={`${window.location.origin}${ROUTES.user.settings.sharedTheme(theme.shareToken)}`}
            label={t("settings.appearance.editor.share.linkLabel")}
            copyLabel={t("settings.appearance.editor.share.copy")}
            copiedMessage={t("settings.appearance.editor.share.copied")}
            copyErrorMessage={t("settings.appearance.editor.share.copyError")}
          />
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon=<Link2Off className="size-4" />
              loading={unshare.isPending}
              disabled={isPending}
              onClick={() =>
                unshare.mutate(theme.id, {
                  onSuccess: () =>
                    toast.success(
                      t("settings.appearance.editor.share.disabled"),
                    ),
                  onError,
                })
              }
            >
              {t("settings.appearance.editor.share.disable")}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="outline"
            icon=<Link2 className="size-4" />
            loading={share.isPending}
            disabled={isPending}
            onClick={() => share.mutate(theme.id, { onError })}
          >
            {t("settings.appearance.editor.share.enable")}
          </Button>
        </div>
      )}
    </BandSection>
  );
};
