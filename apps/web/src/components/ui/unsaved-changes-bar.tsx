import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@lootlog/ui/components/button";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type UnsavedChangesBarProps = {
  isDirty: boolean;
  isSubmitting: boolean;
  onReset: () => void;
  onSubmit?: () => void;
  unsavedChangesLabel?: string;
  resetLabel?: string;
  saveLabel?: string;
  savingLabel?: string;
};

export const UnsavedChangesBar: FC<UnsavedChangesBarProps> = ({
  isDirty,
  isSubmitting,
  onReset,
  unsavedChangesLabel,
  resetLabel,
  saveLabel,
  savingLabel,
}) => {
  const { t } = useTranslation();

  const effectiveUnsavedChangesLabel =
    unsavedChangesLabel ?? t("common.unsavedChanges");
  const effectiveResetLabel = resetLabel ?? t("common.reset");
  const effectiveSaveLabel = saveLabel ?? t("common.save");
  const effectiveSavingLabel = savingLabel ?? t("common.saving");

  return (
    <AnimatePresence>
      {isDirty && (
        <motion.div
          key="unsaved-bar"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{
            duration: 0.2,
            ease: "easeOut",
          }}
          className="pointer-events-none fixed bottom-0 left-0 right-0 md:left-[theme(width.64)] z-50 flex justify-center px-4 pb-4"
        >
          <div className="pointer-events-auto w-full max-w-2xl rounded-xl border bg-background/90  supports-[backdrop-filter]:bg-background p-3 shadow-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-sm font-medium">
                {effectiveUnsavedChangesLabel}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                {effectiveResetLabel}
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? effectiveSavingLabel : effectiveSaveLabel}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
