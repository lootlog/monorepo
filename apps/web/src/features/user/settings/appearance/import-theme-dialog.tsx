import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import {
  customThemeStyle,
  loadCustomThemeFont,
} from "@lootlog/ui/themes/custom-theme";
import { previewThemeClass } from "@lootlog/ui/themes/resolver";
import { getCustomThemePreview } from "@/themes/theme-preview";
import { useUserThemesControllerGetSharedTheme } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Download } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { useTranslation } from "react-i18next";
import { ThemeRow } from "./theme-row";
import { useCreateTheme } from "./use-create-theme";

/** A share token: URL-safe base64, as the API issues them. */
const SHARE_TOKEN = /^[\w-]{16,64}$/u;

/** Reads the token from a share link, or takes a bare token as it is. */
const readShareToken = (input: string) => {
  const value = input.trim();
  const fromLink = /\/import\/([\w-]{16,64})(?:[/?#]|$)/u.exec(value)?.[1];

  return fromLink ?? (SHARE_TOKEN.test(value) ? value : null);
};

/** Saves a copy of a theme someone shared, after a look at it. */
export const ImportThemeDialog = ({ trigger }: { trigger: ReactElement }) => {
  const { t } = useTranslation();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const { create, isPending: isSaving } = useCreateTheme();
  const shareToken = readShareToken(link);

  const { data, isError, isFetching, isPlaceholderData } =
    useUserThemesControllerGetSharedTheme(
      { shareToken: shareToken ?? "" },
      { query: { enabled: shareToken !== null, retry: false } },
    );

  // A placeholder is the previous link's theme: never show or save it.
  const sharedTheme =
    shareToken !== null && !isPlaceholderData ? data : undefined;

  useEffect(() => {
    if (sharedTheme) loadCustomThemeFont(sharedTheme.definition);
  }, [sharedTheme]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) setLink("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sharedTheme || isSaving) return;

    create(sharedTheme.name, sharedTheme.definition);
  };

  const status = () => {
    if (link.trim() === "") return null;

    if (shareToken === null) {
      return t("settings.appearance.import.invalidLink");
    }

    if (isError) return t("settings.appearance.import.notFoundDescription");

    return null;
  };

  const message = status();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <IconDialogHeader
          icon={Download}
          title={t("settings.appearance.import.dialogTitle")}
          description={t("settings.appearance.import.dialogDescription")}
        />
        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={inputId}>
              {t("settings.appearance.import.linkLabel")}
            </Label>
            <Input
              id={inputId}
              autoComplete="off"
              value={link}
              placeholder={t("settings.appearance.import.linkPlaceholder")}
              aria-invalid={message !== null}
              onChange={(event) => setLink(event.target.value)}
            />
            {message && (
              <p className="text-xs text-destructive" role="alert">
                {message}
              </p>
            )}
          </div>

          {sharedTheme ? (
            <ul className="overflow-hidden rounded-lg border">
              <ThemeRow
                title={sharedTheme.name}
                description={t("settings.appearance.basedOn", {
                  base: t(
                    `settings.appearance.themes.${sharedTheme.definition.baseThemeId}.title`,
                  ),
                })}
                preview={getCustomThemePreview(sharedTheme.definition)}
                themeClass={previewThemeClass(
                  sharedTheme.definition.baseThemeId,
                )}
                themeStyle={customThemeStyle(sharedTheme.definition)}
                alwaysThemed
              />
            </ul>
          ) : (
            shareToken !== null &&
            isFetching && <Spinner className="mx-auto size-5" />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!sharedTheme} loading={isSaving}>
              {t("settings.appearance.import.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
