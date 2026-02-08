import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { useSession } from "@/hooks/auth/use-session";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { VolunteersList } from "@/features/party-finder/components/volunteers-list";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export const PartyFinder = () => {
  const {
    "party-finder": { open },
    setOpen,
  } = useWindowsStore();

  const partyGathering = usePartyFinderStore((s) => s.partyGathering);
  const volunteers = usePartyFinderStore((s) => s.volunteers);
  const partyMembers = usePartyStore((s) => s.members);
  const { data: session } = useSession();
  const discordId = session?.user?.discordId;
  const { mutate: cancelPartyGathering, isPending: isCancelling } =
    useCancelPartyGathering();
  const [isInvitingAll, setIsInvitingAll] = useState(false);

  const isOwner = partyGathering && partyGathering.discordId === discordId;

  const invitableVolunteers = volunteers.filter(
    (v) => !partyMembers.some((m) => m.id === Number.parseInt(v.characterId)),
  );

  const handleInviteAll = async () => {
    setIsInvitingAll(true);
    for (const v of invitableVolunteers) {
      window._g(`party&a=inv&id=${v.characterId}`);
      await new Promise((r) => setTimeout(r, 200));
    }
    setIsInvitingAll(false);
  };

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
        <div className="ll:flex ll:flex-col ll:h-full">
          <div className="ll:shrink-0 ll:flex ll:items-center ll:justify-center ll:gap-1 ll:py-1.5 ll:border-b ll:border-gray-700">
            <span className="ll:text-[11px] ll:text-gray-300">Grupa:</span>
            <span className={`ll:text-[11px] ll:font-semibold ${partyMembers.length >= 10 ? "ll:text-red-400" : "ll:text-green-400"}`}>
              {partyMembers.length}/10
            </span>
          </div>
          <div className="ll:flex-1 ll:overflow-auto">
            <VolunteersList />
          </div>
          {isOwner && (
            <div className="ll:shrink-0 ll:p-2 ll:border-t ll:border-gray-700 ll:flex ll:flex-col ll:gap-1.5">
              {invitableVolunteers.length > 0 && (
                <Button
                  onClick={handleInviteAll}
                  disabled={isInvitingAll}
                  className="ll:w-full ll:border-green-500 ll:text-green-400 ll:hover:bg-green-600/20"
                >
                  {isInvitingAll ? (
                    <>
                      <Loader2 className="ll:w-3 ll:h-3 ll:animate-spin ll:mr-1" />
                      Zapraszanie...
                    </>
                  ) : (
                    "Zaproś wszystkich"
                  )}
                </Button>
              )}
              <Button
                onClick={() => cancelPartyGathering()}
                disabled={isCancelling}
                className="ll:w-full ll:bg-red-600/30 ll:border-red-500 ll:hover:bg-red-600/50"
              >
                {isCancelling ? "Kończenie..." : "Zakończ zbieranie grupy"}
              </Button>
            </div>
          )}
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
