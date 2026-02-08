import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useWindowsStore } from "@/store/windows.store";
import { CreatePartyGatheringForm } from "@/features/party-finder/components/create-party-gathering-form";

export const CreatePartyGathering = () => {
  const {
    "create-party-gathering": { open },
    setOpen,
  } = useWindowsStore();

  return (
    <AnimatedWindow isOpen={open} windowKey="create-party-gathering">
      <DraggableWindow
        id="create-party-gathering"
        title="Szukaj grupy"
        onClose={() => setOpen("create-party-gathering", false)}
        minHeight={180}
        minWidth={280}
      >
        <CreatePartyGatheringForm />
      </DraggableWindow>
    </AnimatedWindow>
  );
};
