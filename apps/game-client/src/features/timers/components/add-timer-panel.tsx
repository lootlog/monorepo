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
