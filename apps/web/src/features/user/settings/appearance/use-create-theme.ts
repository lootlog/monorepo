import { getApiErrorStringField } from "@lootlog/client/transport";
import {
  CUSTOM_THEME_LIMIT,
  CUSTOM_THEME_NAME_MAX_LENGTH,
  type CustomThemeDefinition,
} from "@lootlog/schema/custom-theme";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ROUTES } from "@/config/routes";
import { useCreateUserTheme } from "@/hooks/api/user/use-user-themes";

/**
 * Saves a new theme, such as a copy of a built-in one or of a shared link,
 * and opens it in the editor.
 */
export const useCreateTheme = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createTheme = useCreateUserTheme();

  const create = (name: string, definition: CustomThemeDefinition) =>
    createTheme.mutate(
      { name: name.slice(0, CUSTOM_THEME_NAME_MAX_LENGTH), definition },
      {
        onSuccess: (theme) =>
          navigate({ to: ROUTES.user.settings.theme(theme.id) }),
        onError: (error) =>
          toast.error(
            getApiErrorStringField(error, "code") === "USER_THEME_LIMIT_REACHED"
              ? t("settings.appearance.customSection.limitReached", {
                  limit: CUSTOM_THEME_LIMIT,
                })
              : t("settings.appearance.createError"),
          ),
      },
    );

  return { create, isPending: createTheme.isPending };
};
