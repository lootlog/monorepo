import { useDetectorWindowNpcs } from "@/features/npc-detector/hooks/use-detector-window-npcs";
import { QuickAccessReopenButton } from "@/features/quick-access/components/quick-access-reopen-button";
import { Radar } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Reopens the closed NPC detector while it still lists detections. */
export const NpcDetectorReopenButton = () => {
  const { t } = useTranslation("quickAccess");
  const { npcs } = useDetectorWindowNpcs();

  return (
    <QuickAccessReopenButton
      windowId="npc-detector"
      label={t("reopen.npcDetector", { count: npcs.length })}
      icon=<Radar aria-hidden="true" className="ll:size-4" />
      count={npcs.length}
    />
  );
};
