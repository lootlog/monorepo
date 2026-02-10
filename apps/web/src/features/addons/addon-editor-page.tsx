import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lootlog/ui/components/card";
import { Label } from "@lootlog/ui/components/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lootlog/ui/components/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  useAddonTypeBundle,
  useCreateUserAddon,
  useDeleteUserAddon,
  useInstallUserAddon,
  useUninstallUserAddon,
  useUpdateUserAddon,
  useUserAddons,
} from "@/hooks/api/user/use-user-addons";
import type { AddonLanguage } from "@/features/addons/types";
import {
  JS_TEMPLATE,
  TS_TEMPLATE,
  createDraft,
  draftToPayload,
  fromAddon,
} from "@/features/addons/addon-draft";
import {
  DEFAULT_MONACO_ADDON_THEME,
  MONACO_ADDON_THEMES,
  isMonacoAddonThemeId,
  type MonacoAddonThemeId,
} from "@/features/addons/monaco-addon-themes";
import { ROUTES } from "@/config/routes";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  FileCode2,
  PackageCheck,
  PackageX,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

type AddonEditorPageProps = {
  addonId: string;
};

const MonacoAddonEditor = lazy(() =>
  import("@/features/addons/components/monaco-addon-editor").then((module) => ({
    default: module.MonacoAddonEditor,
  })),
);

export const AddonEditorPage = ({ addonId }: AddonEditorPageProps) => {
  const navigate = useNavigate();
  const { data: addons = [], isLoading: addonsLoading } = useUserAddons();
  const { data: typeBundle } = useAddonTypeBundle();

  const createAddonMutation = useCreateUserAddon();
  const updateAddonMutation = useUpdateUserAddon();
  const installAddonMutation = useInstallUserAddon();
  const uninstallAddonMutation = useUninstallUserAddon();
  const deleteAddonMutation = useDeleteUserAddon();

  const isNewAddon = addonId === "new";
  const selectedAddon = useMemo(
    () => addons.find((addon) => addon.id === addonId) ?? null,
    [addons, addonId],
  );

  const [draft, setDraft] = useState(() => createDraft());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [storedEditorTheme, setStoredEditorTheme] = useLocalStorage(
    "lootlog:addons:editor-theme",
    DEFAULT_MONACO_ADDON_THEME,
  );
  const editorTheme: MonacoAddonThemeId = isMonacoAddonThemeId(
    storedEditorTheme,
  )
    ? storedEditorTheme
    : DEFAULT_MONACO_ADDON_THEME;
  const initializedDraftForIdRef = useRef<string | null>(null);

  const isSaving =
    createAddonMutation.isPending ||
    updateAddonMutation.isPending ||
    installAddonMutation.isPending ||
    uninstallAddonMutation.isPending ||
    deleteAddonMutation.isPending;

  useEffect(() => {
    if (!isMonacoAddonThemeId(storedEditorTheme)) {
      setStoredEditorTheme(DEFAULT_MONACO_ADDON_THEME);
    }
  }, [setStoredEditorTheme, storedEditorTheme]);

  useEffect(() => {
    if (isNewAddon) {
      if (initializedDraftForIdRef.current !== "new") {
        initializedDraftForIdRef.current = "new";
        setDraft(createDraft());
      }
      return;
    }

    if (!selectedAddon) {
      return;
    }

    if (initializedDraftForIdRef.current !== selectedAddon.id) {
      initializedDraftForIdRef.current = selectedAddon.id;
      setDraft(fromAddon(selectedAddon));
    }
  }, [isNewAddon, selectedAddon]);

  const handleLanguageChange = (language: AddonLanguage) => {
    setDraft((prev) => {
      const shouldReplaceTemplate =
        prev.sourceCode === TS_TEMPLATE ||
        prev.sourceCode === JS_TEMPLATE ||
        prev.sourceCode.trim().length === 0;

      return {
        ...prev,
        language,
        sourceCode: shouldReplaceTemplate
          ? language === "TYPESCRIPT"
            ? TS_TEMPLATE
            : JS_TEMPLATE
          : prev.sourceCode,
      };
    });
  };

  const handleSourceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const sourceCode = await file.text();
      const extension = file.name.split(".").pop()?.toLowerCase();
      const language: AddonLanguage =
        extension === "js" || extension === "jsx" ? "JAVASCRIPT" : "TYPESCRIPT";

      setDraft((prev) => ({
        ...prev,
        language,
        sourceCode,
      }));

      toast.success(`Loaded source from ${file.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not read selected file",
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveAddon = async () => {
    const payload = draftToPayload(draft);

    if (!payload.sourceCode.trim()) {
      toast.error("Source code cannot be empty");
      return;
    }

    try {
      if (isNewAddon) {
        const created = await createAddonMutation.mutateAsync(payload);
        initializedDraftForIdRef.current = created.id;
        setDraft(fromAddon(created));
        toast.success("Addon created");
        navigate({ to: ROUTES.user.addon(created.id), replace: true });
        return;
      }

      if (!selectedAddon) {
        toast.error("Addon not found");
        return;
      }

      const updated = await updateAddonMutation.mutateAsync({
        addonId: selectedAddon.id,
        payload,
      });
      setDraft(fromAddon(updated));
      toast.success("Addon updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save addon",
      );
    }
  };

  const handleInstallToggle = async () => {
    if (isNewAddon || !selectedAddon) {
      toast.error("Save addon first before installing");
      return;
    }

    try {
      if (draft.installed) {
        await uninstallAddonMutation.mutateAsync(selectedAddon.id);
        setDraft((prev) => ({ ...prev, installed: false }));
        toast.success("Addon uninstalled");
      } else {
        await installAddonMutation.mutateAsync(selectedAddon.id);
        setDraft((prev) => ({ ...prev, installed: true }));
        toast.success("Addon installed");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to toggle installation",
      );
    }
  };

  const handleDeleteAddon = async () => {
    if (isNewAddon || !selectedAddon) {
      return;
    }

    try {
      await deleteAddonMutation.mutateAsync(selectedAddon.id);
      setIsDeleteDialogOpen(false);
      toast.success("Addon deleted");
      navigate({ to: ROUTES.user.addons });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete addon",
      );
    }
  };

  if (!isNewAddon && !addonsLoading && !selectedAddon) {
    return (
      <div className="w-full p-4">
        <Card>
          <CardHeader>
            <CardTitle>Addon not found</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Nie znaleziono dodatku o podanym identyfikatorze.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate({ to: ROUTES.user.addons })}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Wroc do listy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4">
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">
              {isNewAddon ? "Nowy addon" : `Edycja: ${draft.name}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              Edytor kodu dziala w trybie dark i laduje typy z game-client.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">editor themes</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate({ to: ROUTES.user.addons })}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Wroc do listy
            </Button>
            {!isNewAddon && (
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={handleInstallToggle}
              >
                {draft.installed ? (
                  <>
                    <PackageX className="mr-1 h-4 w-4" />
                    Uninstall
                  </>
                ) : (
                  <>
                    <PackageCheck className="mr-1 h-4 w-4" />
                    Install
                  </>
                )}
              </Button>
            )}
            <Button size="sm" disabled={isSaving} onClick={handleSaveAddon}>
              <Save className="mr-1 h-4 w-4" />
              Save
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isSaving || isNewAddon}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <Card className="min-h-0">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Kod addonu</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileCode2 className="h-4 w-4" />
                  IntelliSense + Ctrl/Cmd+S
                </div>
                <Select
                  value={draft.language}
                  onValueChange={(value) =>
                    handleLanguageChange(value as AddonLanguage)
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TYPESCRIPT">TypeScript</SelectItem>
                    <SelectItem value="JAVASCRIPT">JavaScript</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={editorTheme}
                  onValueChange={(value) => {
                    if (isMonacoAddonThemeId(value)) {
                      setStoredEditorTheme(value);
                    }
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONACO_ADDON_THEMES.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="inline-flex">
                  <input
                    type="file"
                    accept=".js,.jsx,.ts,.tsx"
                    className="hidden"
                    onChange={handleSourceUpload}
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    onClick={(event) => {
                      const input = event.currentTarget
                        .previousElementSibling as HTMLInputElement | null;
                      input?.click();
                    }}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Upload file
                  </Button>
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Metadane sa pobierane z <code>defineAddon({`{ ... }`})</code>{" "}
                podczas zapisu.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border bg-background px-2.5 py-2">
                  <Label className="text-[11px] text-muted-foreground">
                    Name
                  </Label>
                  <p className="truncate text-sm font-medium">
                    {draft.name || "-"}
                  </p>
                </div>
                <div className="rounded-md border bg-background px-2.5 py-2">
                  <Label className="text-[11px] text-muted-foreground">
                    Runtime ID
                  </Label>
                  <p className="truncate font-mono text-sm">
                    {draft.runtimeId || "-"}
                  </p>
                </div>
                <div className="rounded-md border bg-background px-2.5 py-2">
                  <Label className="text-[11px] text-muted-foreground">
                    Version
                  </Label>
                  <p className="truncate text-sm">{draft.version || "-"}</p>
                </div>
                <div className="rounded-md border bg-background px-2.5 py-2">
                  <Label className="text-[11px] text-muted-foreground">
                    Description
                  </Label>
                  <p className="truncate text-sm">{draft.description || "-"}</p>
                </div>
              </div>
            </div>

            <Suspense
              fallback={
                <div className="flex h-[70vh] items-center justify-center rounded-md border text-sm text-muted-foreground">
                  Loading Monaco editor...
                </div>
              }
            >
              <MonacoAddonEditor
                value={draft.sourceCode}
                language={
                  draft.language === "TYPESCRIPT" ? "typescript" : "javascript"
                }
                typeBundle={typeBundle}
                onChange={(sourceCode) =>
                  setDraft((prev) => ({
                    ...prev,
                    sourceCode,
                  }))
                }
                onSaveShortcut={() => {
                  void handleSaveAddon();
                }}
                disabled={isSaving}
                height="70vh"
                theme={editorTheme}
              />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete addon</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAddon
                ? `Delete addon "${selectedAddon.name}" permanently?`
                : "Delete this addon permanently?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={() => {
                void handleDeleteAddon();
              }}
            >
              {isSaving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
