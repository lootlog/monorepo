import { ListChecks } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toolbarStripDividerClassName } from "@/components/ui/toolbar-strip";
import { QuickAccessButton } from "@/features/quick-access/components/quick-access-button";
import { SetupChecklist } from "@/features/setup-checklist/components/setup-checklist";
import type { SetupStepId } from "@/features/setup-checklist/setup-checklist-steps";
import { useSetupChecklist } from "@/features/setup-checklist/use-setup-checklist";
import { openLootlogApp } from "@/lib/open-lootlog-app";
import { useWindowsStore } from "@/store/windows.store";

/**
 * The first quick access tile while this character's setup is incomplete: a
 * dot marks it, and its popover lists what is left. It leaves the bar once
 * setup is done or the player hides it; the "Lootlog page" menu brings it
 * back. It never opens on its own, so it cannot take focus from the game.
 */
export const SetupChecklistButton: FC = () => {
  const { t } = useTranslation("quickAccess");
  const [open, setOpen] = useState(false);
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);

  const { steps, remaining, incomplete, dismissed, setDismissed, reconnect } =
    useSetupChecklist();

  if (dismissed || !incomplete) return null;

  const handleAction = (stepId: SetupStepId) => {
    if (stepId === "realtime") {
      reconnect();

      return;
    }

    setOpen(false);

    if (stepId === "sign-in") openAndFocus("extension-login");
    else if (stepId === "join-lootlog") openLootlogApp();
    else
      openAndFocus("settings", {
        activeTab: "catching",
        activeSubsection: "catching",
      });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <QuickAccessButton
            className="ll:relative"
            label={t("setup.remaining", { count: remaining })}
            icon={
              <>
                <ListChecks aria-hidden="true" className="ll:size-4" />
                <span
                  aria-hidden
                  className="ll:pointer-events-none ll:absolute ll:right-0.5 ll:top-0.5 ll:size-2 ll:rounded-full ll:bg-red-500"
                />
              </>
            }
          />
        </PopoverTrigger>
        <PopoverContent className="ll:w-72" align="start" side="bottom">
          <SetupChecklist
            steps={steps}
            remaining={remaining}
            onAction={handleAction}
            onDismiss={() => {
              setOpen(false);
              setDismissed(true);
            }}
          />
        </PopoverContent>
      </Popover>
      <div
        aria-hidden="true"
        className={`${toolbarStripDividerClassName} ll:mx-1 ll:h-4`}
      />
    </>
  );
};
