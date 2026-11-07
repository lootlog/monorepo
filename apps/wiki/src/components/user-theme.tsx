import { useEffect, useLayoutEffect, useState } from "react";
import {
  getUserThemesControllerGetThemesQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  useUserThemesControllerGetThemes,
  useUsersControllerGetUserPreferences,
} from "@lootlog/client/main";
import {
  findSelectedCustomTheme,
  type AppliedCustomTheme,
  readCustomThemeId,
  writeCachedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";
import {
  applyThemeToDocument,
  resolveSelectionTheme,
  resolveStoredSelection,
} from "@lootlog/ui/themes/resolver";
import { useSession } from "@/hooks/use-session";
import {
  writeCustomThemeCookie,
  writeThemeCookie,
} from "@/lib/write-theme-cookie";

type UserThemeProps = {
  /** The theme the server rendered the page in. */
  storedSelection: string | null;
  /** The custom theme's copy the server rendered the page from. */
  storedCustomTheme: AppliedCustomTheme | null;
};

/**
 * Paints the wiki in the theme the User picked in the Web app. The wiki only
 * reads the pick; the Web app's appearance settings change it.
 */
export function UserTheme({
  storedSelection,
  storedCustomTheme,
}: UserThemeProps) {
  const { session } = useSession();
  const isSignedIn = session !== null;

  const { data: preferences } = useUsersControllerGetUserPreferences({
    query: {
      enabled: isSignedIn,
      queryKey: getUsersControllerGetUserPreferencesQueryKey(),
      retry: 1,
    },
  });

  // Signed out, the page keeps the theme it was last shown in, which may be
  // one the preferences brought in after the server rendered the page.
  const [shownSelection, setShownSelection] = useState(storedSelection);
  const preferredSelection = preferences?.theme;

  if (preferredSelection && preferredSelection !== shownSelection) {
    setShownSelection(preferredSelection);
  }

  const selection = resolveStoredSelection(
    preferredSelection ?? shownSelection,
  );

  const customThemeId = readCustomThemeId(selection);

  const { data: userThemes } = useUserThemesControllerGetThemes({
    query: {
      enabled: isSignedIn && customThemeId !== null,
      queryKey: getUserThemesControllerGetThemesQueryKey(),
      staleTime: 60_000,
    },
  });

  // Until the User's themes load, which they never do signed out, the last
  // applied copy keeps the page as the server rendered it.
  const customTheme = userThemes
    ? findSelectedCustomTheme(customThemeId, userThemes)
    : (findSelectedCustomTheme(customThemeId, undefined) ??
      findSelectedCustomTheme(
        customThemeId,
        storedCustomTheme ? [storedCustomTheme] : [],
      ));

  const definition = customTheme?.definition ?? null;
  const theme = resolveSelectionTheme(selection, definition);

  useLayoutEffect(() => {
    applyThemeToDocument({ root: document.documentElement, theme, definition });
  }, [theme, definition]);

  useEffect(() => {
    writeThemeCookie(selection);

    // Without the list and a copy, keep the stored copy; otherwise it follows
    // what the page shows.
    if (customThemeId === null || userThemes || customTheme) {
      writeCachedCustomTheme(customTheme);
      writeCustomThemeCookie(customTheme);
    }
  }, [selection, customThemeId, customTheme, userThemes]);

  return null;
}
