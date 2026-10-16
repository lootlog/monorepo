import { CopyLinkField } from "@/components/common/copy-link-field";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { ROUTES } from "@/config/routes";
import {
  useShareUserTheme,
  useUnshareUserTheme,
} from "@/hooks/api/user/use-user-themes";
import type { UserThemeResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Link2, Link2Off, Share2 } from "lucide-react";
import { useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type ShareThemeDialogProps = {
  theme: UserThemeResponseDto;
  trigger: ReactElement;
};

/**
 * Hands on a theme by link. Opening it creates the link if the theme has
 * none, so sharing is one step; the link can be turned off here too.
 */
export const ShareThemeDialog = ({ theme, trigger }: ShareThemeDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const share = useShareUserTheme();
  const unshare = useUnshareUserTheme();

  const onError = () =>
    toast.error(t("settings.appearance.editor.share.error"));

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen && !theme.shareToken && !share.isPending) {
      share.mutate(theme.id, { onError });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <IconDialogHeader
          icon={Share2}
          title={t("settings.appearance.editor.share.title", {
            name: theme.name,
          })}
          description={t("settings.appearance.editor.share.description")}
        />
        <div className="space-y-4 p-5">
          <div className="flex min-h-9 flex-col justify-center">
            {theme.shareToken ? (
              <CopyLinkField
                url={`${window.location.origin}${ROUTES.user.settings.sharedTheme(theme.shareToken)}`}
                label={t("settings.appearance.editor.share.linkLabel")}
                copyLabel={t("settings.appearance.editor.share.copy")}
                copiedMessage={t("settings.appearance.editor.share.copied")}
                copyErrorMessage={t(
                  "settings.appearance.editor.share.copyError",
                )}
              />
            ) : share.isPending ? (
              <Spinner className="mx-auto size-5" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("settings.appearance.editor.share.off")}
              </p>
            )}
          </div>
          <DialogFooter>
            {theme.shareToken ? (
              <Button
                type="button"
                variant="ghost"
                icon=<Link2Off className="size-4" />
                loading={unshare.isPending}
                className="mr-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
            ) : (
              <Button
                type="button"
                variant="outline"
                icon=<Link2 className="size-4" />
                loading={share.isPending}
                className="mr-auto"
                onClick={() => share.mutate(theme.id, { onError })}
              >
                {t("settings.appearance.editor.share.enable")}
              </Button>
            )}
            <Button type="button" onClick={() => setOpen(false)}>
              {t("settings.appearance.editor.share.done")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
