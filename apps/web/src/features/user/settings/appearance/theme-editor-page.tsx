import { MetaItem } from "@/components/common/meta-item";
import { SettingsDetailNotFound } from "@/components/common/settings-detail-not-found";
import { ROUTES } from "@/config/routes";
import { useUserThemes } from "@/hooks/api/user/use-user-themes";
import { useTheme } from "@/hooks/context/use-theme";
import { toCustomThemePreference } from "@lootlog/ui/themes/custom-theme";
import { getCustomThemePreview } from "@/themes/theme-preview";
import { Button } from "@lootlog/ui/components/button";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Check,
  Layers,
  Link2,
  PaletteIcon,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { DeleteThemeDialog } from "./delete-theme-dialog";
import { ShareThemeDialog } from "./share-theme-dialog";
import { ThemeEditorForm } from "./theme-editor-form";

export const ThemeEditorPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selection, setTheme } = useTheme();
  const { data: userThemes } = useUserThemes();

  const { themeId } = useParams({
    from: "/_authenticated/@me/settings/appearance_/themes/$themeId",
  });

  const theme = userThemes?.find(({ id }) => id === themeId) ?? null;

  if (userThemes && !theme) {
    return (
      <SettingsDetailNotFound
        icon={PaletteIcon}
        title={t("settings.appearance.editor.notFound")}
        description={t("settings.appearance.editor.notFoundDescription")}
        backTo={ROUTES.user.settings.appearance}
        backLabel={t("settings.appearance.editor.backToList")}
      />
    );
  }

  if (!theme) return null;

  const preference = toCustomThemePreference(theme.id);
  const isActive = selection === preference;

  const baseTitle = t(
    `settings.appearance.themes.${theme.definition.baseThemeId}.title`,
  );

  return (
    // Remount on a new theme so the draft starts from it.
    <ThemeEditorForm
      key={theme.id}
      theme={theme}
      name={theme.name}
      media={
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: getCustomThemePreview(theme.definition).colors[0],
          }}
        />
      }
      meta={
        <>
          <MetaItem icon={Layers}>
            {t("settings.appearance.basedOn", { base: baseTitle })}
          </MetaItem>
          {isActive && (
            <MetaItem icon={Check}>
              {t("settings.appearance.editor.active")}
            </MetaItem>
          )}
          {theme.shareToken && (
            <MetaItem icon={Link2}>
              {t("settings.appearance.editor.share.sharedMeta")}
            </MetaItem>
          )}
        </>
      }
      actions={
        <>
          {!isActive && (
            <Button
              size="sm"
              variant="outline"
              icon=<Check className="size-4" />
              onClick={() => setTheme(preference)}
            >
              {t("settings.appearance.editor.apply")}
            </Button>
          )}
          <ShareThemeDialog
            theme={theme}
            trigger={
              <Button
                size="sm"
                variant="ghost"
                icon={
                  theme.shareToken ? (
                    <Link2 className="size-4" />
                  ) : (
                    <Share2 className="size-4" />
                  )
                }
                className={cn(
                  theme.shareToken && "text-primary hover:text-primary",
                )}
              >
                {theme.shareToken
                  ? t("settings.appearance.editor.share.shared")
                  : t("settings.appearance.editor.share.action")}
              </Button>
            }
          />
          <DeleteThemeDialog
            theme={theme}
            onDeleted={async () => {
              await navigate({ to: ROUTES.user.settings.appearance });
            }}
            trigger={
              <Button
                size="sm"
                variant="ghost"
                icon=<Trash2 className="size-4" />
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                {t("settings.appearance.editor.delete.action")}
              </Button>
            }
          />
        </>
      }
    />
  );
};
