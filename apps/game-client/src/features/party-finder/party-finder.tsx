import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { useWindowsStore } from "@/store/windows.store";
import { VolunteersList } from "@/features/party-finder/components/volunteers-list";
import { PartyFinderNpc } from "@/features/party-finder/components/party-finder-npc";

export const PartyFinder = () => {
  const {
    "party-finder": { open },
    setOpen,
  } = useWindowsStore();

  return (
    <AnimatedWindow isOpen={open} windowKey="party-finder">
      <DraggableWindow
        id="party-finder"
        title="Party finder"
        onClose={() => setOpen("party-finder", false)}
        variant="default"
        minHeight={108}
        minWidth={242}
      >
        <PartyFinderNpc />
        <VolunteersList />
      </DraggableWindow>
    </AnimatedWindow>
  );
};
