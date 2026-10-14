import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { Button } from "@lootlog/ui/components/button";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { EASE_EMPHASIZED, MOTION_DURATION } from "@/lib/motion";

export type UnsavedChangesBarProps = {
  isDirty: boolean;
  isSubmitting: boolean;
  onReset: () => void;
  onSubmit?: () => void;
  unsavedChangesLabel?: string;
  resetLabel?: string;
  saveLabel?: string;
};

export const UnsavedChangesBar: FC<UnsavedChangesBarProps> = ({
  isDirty,
  isSubmitting,
  onReset,
  unsavedChangesLabel,
  resetLabel,
  saveLabel,
}) => {
  const { t } = useTranslation();

  const effectiveUnsavedChangesLabel =
    unsavedChangesLabel ?? t("common.unsavedChanges");

  const effectiveResetLabel = resetLabel ?? t("common.reset");
  const effectiveSaveLabel = saveLabel ?? t("common.save");

  return (
    <AnimatePresence>
      {isDirty && (
        <m.div
          key="unsaved-bar"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{
            duration: MOTION_DURATION.medium,
            ease: EASE_EMPHASIZED,
          }}
          className="pointer-events-none fixed bottom-0 left-0 right-0 md:left-(--sidebar-width) z-50 flex justify-center px-4 pb-4"
        >
          {/* A raised, opaque surface, so the bar never blends into the page under it. */}
          <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-xl border border-border bg-popover py-2 pr-2 pl-4 text-popover-foreground shadow-[0_16px_40px_-16px_rgb(0_0_0/0.65)]">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-signal-timer"
            />
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {effectiveUnsavedChangesLabel}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                disabled={isSubmitting}
              >
                {effectiveResetLabel}
              </Button>
              <Button type="submit" variant="default" loading={isSubmitting}>
                {effectiveSaveLabel}
              </Button>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
