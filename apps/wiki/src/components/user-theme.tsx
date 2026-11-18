import { useState } from "react";
import {
  getUserThemesControllerGetThemesQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  useUserThemesControllerGetThemes,
  useUsersControllerGetUserPreferences,
} from "@lootlog/client/main";
import {
  readCachedCustomTheme,
  readCustomThemeId,
  type AppliedCustomTheme,
} from "@lootlog/ui/themes/custom-theme";
import { resolveStoredSelection } from "@lootlog/ui/themes/resolver";
import { resolveThemeLook, useThemeSync } from "@lootlog/ui/themes/theme-sync";
import { wikiThemePersistence } from "@/config/theme-cookie";
import { useSession } from "@/hooks/use-session";

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
  const look = resolveThemeLook({
    selection,
    userThemes,
    cachedCustomThemes: [readCachedCustomTheme(), storedCustomTheme],
  });

  useThemeSync({
    selection,
    look,
    userThemes,
    persistence: wikiThemePersistence,
  });

  return null;
}
