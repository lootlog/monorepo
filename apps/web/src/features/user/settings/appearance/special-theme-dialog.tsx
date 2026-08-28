import { useEffect, useState } from "react";
import type { ThemeDensity, ThemeMotion } from "@lootlog/types";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Field, FieldLabel } from "@lootlog/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { useTranslation } from "react-i18next";

interface SpecialThemeDialogProps {
  title: string;
  open: boolean;
  density: ThemeDensity;
  motion: ThemeMotion;
  onOpenChange: (open: boolean) => void;
  onSave: (density: ThemeDensity, motion: ThemeMotion) => Promise<void>;
}

const DENSITY_OPTIONS: ThemeDensity[] = ["compact", "standard", "comfortable"];
const MOTION_OPTIONS: ThemeMotion[] = ["quiet", "standard", "expressive"];

export const SpecialThemeDialog = ({
  title,
  open,
  density: initialDensity,
  motion: initialMotion,
  onOpenChange,
  onSave,
}: SpecialThemeDialogProps) => {
  const { t } = useTranslation();
  const [density, setDensity] = useState(initialDensity);
  const [motion, setMotion] = useState(initialMotion);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDensity(initialDensity);
      setMotion(initialMotion);
    }
  }, [initialDensity, initialMotion, open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(density, motion);
      onOpenChange(false);
    } catch {
      // The theme provider keeps the dialog open and reports the mutation error.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t("settings.appearance.specialControls.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-4 pb-2 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t("settings.appearance.builder.density")}</FieldLabel>
            <Select
              items={{
                compact: t("settings.appearance.options.density.compact"),
                standard: t("settings.appearance.options.density.standard"),
                comfortable: t(
                  "settings.appearance.options.density.comfortable",
                ),
              }}
              value={density}
              onValueChange={(value) => setDensity(value ?? initialDensity)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DENSITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`settings.appearance.options.density.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("settings.appearance.builder.motion")}</FieldLabel>
            <Select
              items={{
                quiet: t("settings.appearance.options.motion.quiet"),
                standard: t("settings.appearance.options.motion.standard"),
                expressive: t("settings.appearance.options.motion.expressive"),
              }}
              value={motion}
              onValueChange={(value) => setMotion(value ?? initialMotion)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`settings.appearance.options.motion.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter className="p-4 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
