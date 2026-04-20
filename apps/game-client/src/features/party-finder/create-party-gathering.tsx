import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useWindowsStore } from "@/store/windows.store";
import { CreatePartyGatheringForm } from "@/features/party-finder/components/create-party-gathering-form";
import { useTranslation } from "react-i18next";

export const CreatePartyGathering = () => {
  const { t } = useTranslation("party-finder");
  const open = useWindowsStore((state) => state["create-party-gathering"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);

  return (
    <AnimatedWindow isOpen={open} windowKey="create-party-gathering">
      <DraggableWindow
        id="create-party-gathering"
        title={t("party-finder.window.createTitle")}
        onClose={() => setOpen("create-party-gathering", false)}
        minHeight={180}
        minWidth={280}
      >
        <CreatePartyGatheringForm />
      </DraggableWindow>
    </AnimatedWindow>
  );
};
