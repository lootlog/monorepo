import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { Button } from "@lootlog/ui/components/button";
import { Kbd, KbdGroup } from "@lootlog/ui/components/kbd";
import { cn } from "cn";
import { useEffect, useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { getPrimaryModifierKeyLabel } from "@/utils/platform/get-primary-modifier-key-label";

export type UnsavedChangesBarProps = {
  isDirty: boolean;
  isSubmitting: boolean;
  onReset: () => void;
  unsavedChangesLabel?: string;
  resetLabel?: string;
  saveLabel?: string;
};

/** The sidebar's spring, so the bar settles like the navigation does. */
const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;

/**
 * The save bar of a form page, docked to the bottom edge as the top bar is to
 * the top. It renders inside the page's form, so its save button submits that
 * form, and ⌘S or Ctrl+S presses it while there are changes.
 */
export const UnsavedChangesBar: FC<UnsavedChangesBarProps> = ({
  isDirty,
  isSubmitting,
  onReset,
  unsavedChangesLabel,
  resetLabel,
  saveLabel,
}) => {
  const { t } = useTranslation();
  const submitRef = useRef<HTMLButtonElement>(null);
  const modifier = getPrimaryModifierKeyLabel();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "s" ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      // A form page saves its own changes instead of the browser saving the page.
      event.preventDefault();

      const submit = submitRef.current;

      if (isDirty && !isSubmitting && !event.repeat && submit?.form) {
        submit.form.requestSubmit(submit);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, isSubmitting]);

  return (
    <AnimatePresence>
      {isDirty && (
        <m.div
          key="unsaved-bar"
          aria-live="polite"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={SPRING}
          className="fixed right-0 bottom-0 left-0 z-50 md:left-(--sidebar-width)"
        >
          {/*
            The top bar's surface, blur and hairline, mirrored at the bottom
            edge; its hairline continues the sidebar footer's.
          */}
          <div
            className={cn(
              "box-content flex h-14 items-center gap-1 border-t border-sidebar-border bg-sidebar/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg backdrop-saturate-150",
              LIST_TILE_INSET_CLASS,
            )}
          >
            <p className="mr-auto line-clamp-2 min-w-0 text-sm leading-tight font-medium sm:line-clamp-1">
              {unsavedChangesLabel ?? t("common.unsavedChanges")}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-foreground"
              >
                {resetLabel ?? t("common.reset")}
              </Button>
              <span className="relative flex">
                {/* Once the bar lands, two accent rings ripple out of the save button. */}
                <m.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-primary"
                  initial={{ opacity: 0.9, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.45 }}
                  transition={{
                    duration: 0.9,
                    ease: "easeOut",
                    delay: 0.35,
                    repeat: 1,
                    repeatDelay: 0.15,
                  }}
                />
                <Button
                  ref={submitRef}
                  type="submit"
                  loading={isSubmitting}
                  aria-keyshortcuts="Meta+S Control+S"
                >
                  {saveLabel ?? t("common.save")}
                  {/* Keyboards only: phones drop the hint. */}
                  <KbdGroup
                    aria-hidden="true"
                    className="-mr-1.5 max-sm:hidden"
                  >
                    <Kbd className="bg-primary-foreground/15 text-primary-foreground">
                      {modifier}
                    </Kbd>
                    <Kbd className="bg-primary-foreground/15 text-primary-foreground">
                      S
                    </Kbd>
                  </KbdGroup>
                </Button>
              </span>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
