import { useEffect, useLayoutEffect } from "react";
import {
  getUserThemesControllerGetThemesQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  useUserThemesControllerGetThemes,
  useUsersControllerGetUserPreferences,
} from "@lootlog/client/main";
import {
  findSelectedCustomTheme,
  readCustomThemeId,
  writeCachedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";
import {
  applyThemeToDocument,
  resolveSelectionTheme,
  resolveStoredSelection,
} from "@lootlog/ui/themes/resolver";
import { useSession } from "@/hooks/use-session";
import { writeThemeCookie } from "@/lib/write-theme-cookie";

type UserThemeProps = {
  /** The theme the server rendered the page in. */
  storedSelection: string | null;
};

/**
 * Paints the wiki in the theme the User picked in the Web app. The wiki only
 * reads the pick; the Web app's appearance settings change it.
 */
export function UserTheme({ storedSelection }: UserThemeProps) {
  const { session } = useSession();
  const isSignedIn = session !== null;

  const { data: preferences } = useUsersControllerGetUserPreferences({
    query: {
      enabled: isSignedIn,
      queryKey: getUsersControllerGetUserPreferencesQueryKey(),
      retry: 1,
    },
  });

  // Signed out, the page keeps the theme it was last shown in.
  const selection = resolveStoredSelection(
    preferences?.theme ?? storedSelection,
  );

  const customThemeId = readCustomThemeId(selection);

  const { data: userThemes } = useUserThemesControllerGetThemes({
    query: {
      enabled: isSignedIn && customThemeId !== null,
      queryKey: getUserThemesControllerGetThemesQueryKey(),
      staleTime: 60_000,
    },
  });

  const customTheme = findSelectedCustomTheme(customThemeId, userThemes);
  const definition = customTheme?.definition ?? null;
  const theme = resolveSelectionTheme(selection, definition);

  useLayoutEffect(() => {
    applyThemeToDocument({ root: document.documentElement, theme, definition });
  }, [theme, definition]);

  useEffect(() => {
    writeThemeCookie(selection);

    // Keep the cache while the list loads; once it has, it follows the pick.
    if (customThemeId === null || userThemes) {
      writeCachedCustomTheme(customTheme);
    }
  }, [selection, customThemeId, customTheme, userThemes]);

  return null;
}
