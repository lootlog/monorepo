import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  useTimerSoundSettings,
  useUpdateSoundSettings,
} from "@/lib/settings-persistence/use-sound-settings";
import { Volume2, VolumeX } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type TimerSoundMenuItemProps = {
  npcName: string;
  npcType: string;
};

export const TimerSoundMenuItem: FC<TimerSoundMenuItemProps> = ({
  npcName,
  npcType,
}) => {
  const { t } = useTranslation("timers");
  const settings = useTimerSoundSettings();
  const { mutate: updateSettings } = useUpdateSoundSettings();
  const npcNames = settings?.timerSoundNpcNames ?? [];
  const isSelected = npcNames.includes(npcName);
  const isTypeEnabled = settings?.timersConfig[npcType]?.enabled ?? false;

  if (isTypeEnabled && !isSelected) {
    return (
      <ContextMenuItem disabled className="ll:text-foreground">
        <Volume2 className="ll:h-4 ll:w-4 ll:mr-2" />
        {t("contextMenu.soundByType")}
      </ContextMenuItem>
    );
  }

  return (
    <ContextMenuItem
      disabled={!settings}
      onClick={() =>
        updateSettings({
          timerSoundNpcNames: isSelected
            ? npcNames.filter((name) => name !== npcName)
            : [...npcNames, npcName],
        })
      }
      data-active={isSelected}
      className="ll:text-foreground ll:data-[active=true]:bg-primary ll:data-[active=true]:text-primary-foreground ll:data-[active=true]:data-[highlighted]:bg-primary/90 ll:data-[active=true]:hover:bg-primary/90 ll:data-[active=true]:focus-visible:bg-primary/90"
    >
      {isSelected ? (
        <VolumeX className="ll:h-4 ll:w-4 ll:mr-2" />
      ) : (
        <Volume2 className="ll:h-4 ll:w-4 ll:mr-2" />
      )}
      {isSelected ? t("contextMenu.soundOff") : t("contextMenu.soundOn")}
    </ContextMenuItem>
  );
};
