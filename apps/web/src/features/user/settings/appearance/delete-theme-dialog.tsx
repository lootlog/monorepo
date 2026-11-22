import { useDeleteUserTheme } from "@/hooks/api/user/use-user-themes";
import { useTheme } from "@/hooks/context/use-theme";
import { toCustomThemePreference } from "@lootlog/ui/themes/custom-theme";
import type { UserThemeResponseDto } from "@lootlog/client/main";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/lib/toast";

type DeleteThemeDialogProps = {
  theme: UserThemeResponseDto;
  trigger: ReactElement;
  onDeleted?: () => Promise<void>;
};

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
    <ConfirmDialog
      title={t("settings.appearance.editor.delete.title", { name: theme.name })}
      description={t("settings.appearance.editor.delete.description", {
        base: t(`settings.appearance.themes.${baseThemeId}.title`),
      })}
      confirmButtonLabel={t("settings.appearance.editor.delete.confirm")}
      cancelButtonLabel={t("common.cancel")}
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
