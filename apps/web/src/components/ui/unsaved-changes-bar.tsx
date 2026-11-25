import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { Button } from "@lootlog/ui/components/button";
import { Kbd, KbdGroup } from "@lootlog/ui/components/kbd";
import { cn } from "cn";
import { useEffect, useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { LIST_TILE_INSET_CLASS } from "@lootlog/ui/lib/list-tile";
import { getPrimaryModifierKeyLabel } from "@lootlog/ui/lib/primary-modifier-key";

export type UnsavedChangesBarProps = {
  isDirty: boolean;
  isSubmitting: boolean;
  onReset: () => void;
  unsavedChangesLabel?: string;
  resetLabel?: string;
  saveLabel?: string;
};

const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;

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

      const target = event.target instanceof Element ? event.target : null;

      if (target?.closest('[role="dialog"], [role="alertdialog"]')) {
        return;
      }

      event.preventDefault();

      const submit = submitRef.current;
      const form = submit?.form;
      const targetForm = target?.closest("form");

      if (
        !isDirty ||
        isSubmitting ||
        event.repeat ||
        !submit ||
        !form ||
        (targetForm && targetForm !== form)
      ) {
        return;
      }

      form.requestSubmit(submit);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, isSubmitting]);

  return (
    <AnimatePresence>
      {isDirty && (
        <m.div
          key="unsaved-bar"
          data-slot="unsaved-changes-bar"
          aria-live="polite"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={SPRING}
          className="fixed right-0 bottom-0 left-0 z-50 md:left-(--sidebar-width)"
        >
          <div
            className={cn(
              "box-content flex h-14 items-center gap-1 border-t border-sidebar-border bg-sidebar/80 opaque:bg-sidebar opaque:backdrop-blur-none pb-[env(safe-area-inset-bottom)] backdrop-blur-lg backdrop-saturate-150",
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
