import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { useWindowOpen } from "@/hooks/ui/use-window-open";
import { useWindowsStore } from "@/store/windows.store";
import { CreatePartyGatheringForm } from "@/features/party-finder/components/create-party-gathering-form";
import { useTranslation } from "react-i18next";

export const CreatePartyGathering = () => {
  const { t } = useTranslation("partyFinder");
  const open = useWindowOpen("create-party-gathering");
  const setOpen = useWindowsStore((state) => state.setOpen);

  return (
    <DraggableWindow
      isOpen={open}
      id="create-party-gathering"
      title={t("window.createTitle")}
      onClose={() => setOpen("create-party-gathering", false)}
      contentClassName="ll:-mx-1 ll:-mb-1"
      minHeight={180}
      minWidth={280}
    >
      <CreatePartyGatheringForm />
    </DraggableWindow>
  );
};
