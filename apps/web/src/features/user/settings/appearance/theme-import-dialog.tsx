import { useState, type ChangeEvent } from "react";
import { PORTABLE_THEME_MAX_BYTES, type PortableTheme } from "@lootlog/types";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Textarea } from "@lootlog/ui/components/textarea";
import { FileJson, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { decodePortableTheme } from "@/themes/portable-theme";

interface ThemeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (theme: PortableTheme) => Promise<void>;
}

const getImportErrorKey = (error: unknown) => {
  if (!(error instanceof Error)) return "invalid";
  if (error.message === "THEME_IMPORT_TOO_LARGE") return "tooLarge";
  if (error.message === "THEME_IMPORT_INVALID_CODE") return "corrupted";
  if (error.message === "THEME_IMPORT_UNSUPPORTED_VERSION") {
    return "unsupportedVersion";
  }
  return "invalid";
};

export const ThemeImportDialog = ({
  open,
  onOpenChange,
  onImport,
}: ThemeImportDialogProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState<PortableTheme | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const inspectValue = (nextValue: string) => {
    setValue(nextValue);
    try {
      setPreview(decodePortableTheme(nextValue));
      setErrorKey(null);
    } catch (error) {
      setPreview(null);
      setErrorKey(getImportErrorKey(error));
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > PORTABLE_THEME_MAX_BYTES) {
      setValue("");
      setPreview(null);
      setErrorKey("tooLarge");
      event.target.value = "";
      return;
    }
    inspectValue(await file.text());
    event.target.value = "";
  };

  const handleImport = async () => {
    if (!preview) return;
    setIsImporting(true);
    try {
      await onImport(preview);
      setValue("");
      setPreview(null);
      onOpenChange(false);
    } catch {
      // The theme provider keeps the dialog open and reports the mutation error.
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.appearance.import.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.appearance.import.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-4 pb-2">
          <Textarea
            value={value}
            onChange={(event) => inspectValue(event.target.value)}
            placeholder={t("settings.appearance.import.placeholder")}
            className="min-h-32 font-mono text-xs"
            aria-label={t("settings.appearance.import.codeLabel")}
          />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-input-focus hover:bg-surface-hover hover:text-foreground focus-within:ring-2 focus-within:ring-ring">
            <Upload className="size-4" />
            {t("settings.appearance.import.chooseFile")}
            <input
              type="file"
              accept=".json,.lootlog-theme.json,application/json"
              className="sr-only"
              onChange={handleFile}
            />
          </label>
          {errorKey ? (
            <Alert variant="destructive">
              <AlertDescription>
                {t(`settings.appearance.import.errors.${errorKey}`)}
              </AlertDescription>
            </Alert>
          ) : null}
          {preview ? (
            <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
              <FileJson className="size-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{preview.name}</p>
                <div className="mt-1 flex gap-1">
                  {preview.config.charts.map((color) => (
                    <span
                      key={color}
                      className="size-3 rounded-full border"
                      style={{
                        backgroundColor: color,
                        borderColor: preview.config.tokens.border,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <DialogFooter className="p-4 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!preview || isImporting}
            onClick={handleImport}
          >
            {isImporting
              ? t("settings.appearance.import.importing")
              : t("settings.appearance.import.action")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
