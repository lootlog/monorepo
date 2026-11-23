import { getApiErrorStringField } from "@lootlog/client/transport";
import {
  CUSTOM_THEME_NAME_MAX_LENGTH,
  type CustomThemeDefinition,
} from "@lootlog/schema/custom-theme";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/lib/toast";
import { ROUTES } from "@/config/routes";
import { useCreateUserTheme } from "@/hooks/api/user/use-user-themes";
import { useUserLimits } from "@/hooks/api/user/use-user-limits";

export const useCreateTheme = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createTheme = useCreateUserTheme();
  const { data: limits } = useUserLimits();

  const create = (name: string, definition: CustomThemeDefinition) =>
    createTheme.mutate(
      { name: name.slice(0, CUSTOM_THEME_NAME_MAX_LENGTH), definition },
      {
        onSuccess: (theme) =>
          navigate({ to: ROUTES.user.settings.theme(theme.id) }),
        onError: (error) =>
          toast.error(
            getApiErrorStringField(error, "code") ===
              "USER_THEME_LIMIT_REACHED" && limits
              ? t("settings.appearance.customSection.limitReached", {
                  limit: limits.customThemes,
                })
              : t("settings.appearance.createError"),
          ),
      },
    );

  return { create, isPending: createTheme.isPending };
};
