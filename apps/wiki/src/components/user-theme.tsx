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
  storedSelection: string | null;
  storedCustomTheme: AppliedCustomTheme | null;
};

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
