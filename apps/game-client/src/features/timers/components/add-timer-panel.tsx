import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { WindowOverlayPanel } from "@/components/draggable-window/window-overlay-panel";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { AddTimerForm } from "./add-timer-form";

type AddTimerPanelProps = {
  guildId?: string;
  world: string;
  onClose: () => void;
  className?: string;
};

/**
 * Overlay that covers the timers list while the user adds a manual timer. It
 * stays inside the window, so the title bar and the "+" action remain reachable
 * and the target Lootlog is the one the window already shows. Cancel in the
 * form footer and Escape are the ways out.
 */
export const AddTimerPanel: FC<AddTimerPanelProps> = ({
  guildId,
  world,
  onClose,
  className,
}) => {
  const { t } = useTranslation("timers");
  const { visibleGuilds } = useLootlogGuilds();
  const guildName = visibleGuilds.find((guild) => guild.id === guildId)?.name;

  return (
    <WindowOverlayPanel
      title={t("window.addTitle")}
      subtitle={guildName}
      onClose={onClose}
      className={className}
    >
      <AddTimerForm guildId={guildId} world={world} onClose={onClose} />
    </WindowOverlayPanel>
  );
};
