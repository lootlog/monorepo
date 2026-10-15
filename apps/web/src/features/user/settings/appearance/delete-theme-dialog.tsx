import { useDeleteUserTheme } from "@/hooks/api/user/use-user-themes";
import { useTheme } from "@/hooks/context/use-theme";
import { toCustomThemePreference } from "@/themes/custom-theme";
import type { UserThemeResponseDto } from "@lootlog/client/main";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type DeleteThemeDialogProps = {
  theme: UserThemeResponseDto;
  trigger: ReactNode;
  /** Runs once the theme is gone, such as leaving its editor. */
  onDeleted?: () => Promise<void>;
};

/**
 * Confirms deleting one of the User's themes. A theme in use hands the app
 * back to its base, as the server does with the stored preference.
 */
export const DeleteThemeDialog = ({
  theme,
  trigger,
  onDeleted,
}: DeleteThemeDialogProps) => {
  const { t } = useTranslation();
  const { selection, setTheme } = useTheme();
  const deleteTheme = useDeleteUserTheme();
  const baseThemeId = theme.definition.baseThemeId;

  return (
    <ConfirmDeleteDialog
      title={t("settings.appearance.editor.delete.title", { name: theme.name })}
      description={t("settings.appearance.editor.delete.description", {
        base: t(`settings.appearance.themes.${baseThemeId}.title`),
      })}
      confirmButtonLabel={t("settings.appearance.editor.delete.confirm")}
      onConfirm={async () => {
        try {
          await deleteTheme.mutateAsync(theme.id);
        } catch (error) {
          toast.error(t("settings.appearance.editor.delete.error"));
          throw error;
        }

        if (selection === toCustomThemePreference(theme.id)) {
          setTheme(baseThemeId);
        }

        await onDeleted?.();
      }}
      trigger={trigger}
    />
  );
};
