import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserThemesControllerGetThemesQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  userThemesControllerCreateTheme,
  userThemesControllerDeleteTheme,
  userThemesControllerShareTheme,
  userThemesControllerUnshareTheme,
  userThemesControllerUpdateTheme,
  useUserThemesControllerGetThemes,
  type CreateUserThemeDto,
  type UpdateUserThemeDto,
  type UserThemeResponseDto,
} from "@lootlog/client/main";

export const useUserThemes = ({ enabled = true } = {}) =>
  useUserThemesControllerGetThemes({
    query: {
      queryKey: getUserThemesControllerGetThemesQueryKey(),
      enabled,
      staleTime: 60_000,
    },
  });

/** Every theme write answers with the theme, so the list updates in place. */
const useThemeListWrite = <Variables>(
  write: (variables: Variables) => Promise<UserThemeResponseDto>,
) => {
  const queryClient = useQueryClient();
  const queryKey = getUserThemesControllerGetThemesQueryKey();

  return useMutation({
    mutationFn: write,
    onSuccess: (theme) => {
      queryClient.setQueryData<UserThemeResponseDto[]>(queryKey, (themes) =>
        themes?.some(({ id }) => id === theme.id)
          ? themes.map((current) => (current.id === theme.id ? theme : current))
          : [...(themes ?? []), theme],
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
};

export const useCreateUserTheme = () =>
  useThemeListWrite((payload: CreateUserThemeDto) =>
    userThemesControllerCreateTheme(payload),
  );

export const useUpdateUserTheme = () =>
  useThemeListWrite(
    ({ themeId, payload }: { themeId: string; payload: UpdateUserThemeDto }) =>
      userThemesControllerUpdateTheme({ themeId }, payload),
  );

export const useShareUserTheme = () =>
  useThemeListWrite((themeId: string) =>
    userThemesControllerShareTheme({ themeId }),
  );

export const useUnshareUserTheme = () =>
  useThemeListWrite((themeId: string) =>
    userThemesControllerUnshareTheme({ themeId }),
  );

export const useDeleteUserTheme = () => {
  const queryClient = useQueryClient();
  const queryKey = getUserThemesControllerGetThemesQueryKey();

  return useMutation({
    mutationFn: (themeId: string) =>
      userThemesControllerDeleteTheme({ themeId }),
    onSuccess: (_response, themeId) => {
      queryClient.setQueryData<UserThemeResponseDto[]>(queryKey, (themes) =>
        themes?.filter(({ id }) => id !== themeId),
      );
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        // Deleting the selected theme moves the stored preference to its base.
        queryClient.invalidateQueries({
          queryKey: getUsersControllerGetUserPreferencesQueryKey(),
        }),
      ]),
  });
};
