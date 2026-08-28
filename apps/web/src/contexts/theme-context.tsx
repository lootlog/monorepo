import {
  createDefaultThemeLibrary,
  normalizeThemeLibrary,
  type ThemeConfigV1,
  type ThemeLibrary,
  type ThemePatchOperation,
  type ThemeSelection,
  isSpecialThemeId,
} from "@lootlog/types";
import {
  getUsersControllerGetThemeLibraryQueryKey,
  useSetUsersControllerGetThemeLibraryQueryData,
  useUsersControllerGetThemeLibrary,
  useUsersControllerPatchThemeLibrary,
} from "@lootlog/api-client/react-query/main/users";
import { getApiErrorStatus } from "@lootlog/api-client/transport";
import {
  createContext,
  useEffect,
  useLayoutEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSession } from "@/hooks/auth/use-session";
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  type ResolvedThemeId,
  type ThemeId,
} from "@/themes/catalog";
import { PRESET_THEME_CONFIGS } from "@/themes/preset-configs";
import {
  applyThemeClassToRoot,
  getRootResolvedTheme,
  resolveThemeClass,
} from "@/themes/resolver";
import {
  applyThemeConfig,
  parseThemeSnapshot,
  serializeThemeSnapshot,
  THEME_SNAPSHOT_STORAGE_KEY,
} from "@/themes/runtime";

interface PatchThemeLibraryOptions {
  optimisticLibrary?: ThemeLibrary;
}

export interface ThemePreviewSession {
  config: ThemeConfigV1;
  name: string;
  returnTo: string;
}

interface ThemeContextType {
  theme: ThemeId;
  resolvedTheme: ResolvedThemeId;
  selection: ThemeSelection;
  activeConfig: ThemeConfigV1;
  library: ThemeLibrary;
  setTheme: (theme: ThemeId) => void;
  patchLibrary: (
    operations: ThemePatchOperation[],
    options?: PatchThemeLibraryOptions,
  ) => Promise<ThemeLibrary>;
  previewSession: ThemePreviewSession | null;
  startPreviewSession: (session: ThemePreviewSession) => void;
  stopPreviewSession: () => void;
  isLoading: boolean;
  isSaving: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

interface ThemeProviderProps {
  children: ReactNode;
}

const getSnapshotLibrary = (
  snapshot: ReturnType<typeof parseThemeSnapshot>,
) => {
  return snapshot?.selection
    ? { ...createDefaultThemeLibrary(), selection: snapshot.selection }
    : createDefaultThemeLibrary();
};

const getActiveTheme = (
  library: ThemeLibrary,
  bootstrapConfig?: ThemeConfigV1,
) => {
  if (library.selection.kind === "custom") {
    const selectedThemeId = library.selection.themeId;
    const customTheme = library.customThemes.find(
      (theme) => theme.id === selectedThemeId,
    );
    if (customTheme) {
      return {
        theme: DEFAULT_THEME_ID,
        config: customTheme.config,
      };
    }
    if (bootstrapConfig) {
      return {
        theme: DEFAULT_THEME_ID,
        config: bootstrapConfig,
      };
    }
  }

  const theme =
    library.selection.kind === "preset"
      ? library.selection.presetId
      : DEFAULT_THEME_ID;
  const specialOverrides = isSpecialThemeId(theme)
    ? library.specialOverrides[theme]
    : undefined;
  return {
    theme,
    config: specialOverrides
      ? {
          ...PRESET_THEME_CONFIGS[theme],
          density: specialOverrides.density,
          motion: specialOverrides.motion,
        }
      : PRESET_THEME_CONFIGS[theme],
  };
};

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const setThemeLibraryQueryData =
    useSetUsersControllerGetThemeLibraryQueryData();
  const [bootstrapSnapshot] = useState(() =>
    parseThemeSnapshot(localStorage.getItem(THEME_SNAPSHOT_STORAGE_KEY)),
  );
  const [localLibrary, setLocalLibrary] = useState<ThemeLibrary>(() =>
    getSnapshotLibrary(bootstrapSnapshot),
  );
  const [optimisticLibrary, setOptimisticLibrary] =
    useState<ThemeLibrary | null>(null);
  const [previewSession, setPreviewSession] =
    useState<ThemePreviewSession | null>(null);
  const { data, isLoading, refetch } = useUsersControllerGetThemeLibrary({
    query: {
      enabled: Boolean(session?.user),
      queryKey: getUsersControllerGetThemeLibraryQueryKey(),
      retry: 1,
    },
  });
  const serverLibrary = normalizeThemeLibrary(data);
  const library = optimisticLibrary ?? serverLibrary ?? localLibrary;
  const savedTheme = getActiveTheme(library, bootstrapSnapshot?.config);
  const activeTheme = previewSession
    ? { theme: DEFAULT_THEME_ID, config: previewSession.config }
    : savedTheme;
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemeId>(() =>
    resolveThemeClass(
      activeTheme.theme,
      getRootResolvedTheme(document.documentElement),
    ),
  );

  const patchMutation = useUsersControllerPatchThemeLibrary({
    mutation: {
      onSuccess: (updatedLibrary) => {
        const parsedLibrary = normalizeThemeLibrary(updatedLibrary);
        if (!parsedLibrary) {
          throw new Error("INVALID_THEME_LIBRARY_RESPONSE");
        }
        setLocalLibrary(parsedLibrary);
        setOptimisticLibrary(null);
        setThemeLibraryQueryData(updatedLibrary);
      },
      onError: (error) => {
        setOptimisticLibrary(null);
        void refetch();
        toast.error(
          getApiErrorStatus(error) === 409
            ? t("settings.appearance.toasts.conflict")
            : t("settings.appearance.toasts.saveError"),
        );
      },
    },
  });

  useEffect(() => {
    if (serverLibrary) {
      setLocalLibrary(serverLibrary);
    }
  }, [data]);

  useLayoutEffect(() => {
    setResolvedTheme((currentResolvedTheme) =>
      resolveThemeClass(
        activeTheme.theme,
        getRootResolvedTheme(document.documentElement) ?? currentResolvedTheme,
      ),
    );
  }, [activeTheme.theme]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    applyThemeClassToRoot({ root, resolvedTheme });
    applyThemeConfig(root, activeTheme.config);
  }, [activeTheme.config, resolvedTheme]);

  useEffect(() => {
    if (!previewSession) return undefined;
    const endPreviewOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewSession(null);
    };
    window.addEventListener("keydown", endPreviewOnEscape);
    return () => window.removeEventListener("keydown", endPreviewOnEscape);
  }, [previewSession]);

  useEffect(() => {
    localStorage.setItem(
      THEME_SNAPSHOT_STORAGE_KEY,
      serializeThemeSnapshot({
        version: 1,
        selection: library.selection,
        ...(library.selection.kind === "preset"
          ? { presetId: savedTheme.theme }
          : {}),
        config: savedTheme.config,
      }),
    );
    if (library.selection.kind === "preset") {
      localStorage.setItem(THEME_STORAGE_KEY, savedTheme.theme);
    }
  }, [library.selection, savedTheme.config, savedTheme.theme]);

  const patchLibrary = async (
    operations: ThemePatchOperation[],
    options?: PatchThemeLibraryOptions,
  ) => {
    if (options?.optimisticLibrary) {
      setOptimisticLibrary(options.optimisticLibrary);
    }
    const response = await patchMutation.mutateAsync({
      data: { revision: library.revision, operations },
    });
    const parsedLibrary = normalizeThemeLibrary(response);
    if (!parsedLibrary) {
      throw new Error("INVALID_THEME_LIBRARY_RESPONSE");
    }
    return parsedLibrary;
  };

  const setTheme = (theme: ThemeId) => {
    const selection = { kind: "preset", presetId: theme } as const;
    void patchLibrary([{ kind: "select", selection }], {
      optimisticLibrary: { ...library, selection },
    }).catch(() => undefined);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme.theme,
        resolvedTheme,
        selection: library.selection,
        activeConfig: activeTheme.config,
        library,
        setTheme,
        patchLibrary,
        previewSession,
        startPreviewSession: setPreviewSession,
        stopPreviewSession: () => setPreviewSession(null),
        isLoading,
        isSaving: patchMutation.isPending,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
