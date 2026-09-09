import { useRef, useState } from "react";
import { UserPlus, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";

export function ChatGatheringInviteButton({
  onErrorChange,
}: {
  onErrorChange: (failed: boolean) => void;
}) {
  const { t } = useTranslation("chat");
  const { inviteParticipants, canInviteParticipants } =
    useReadyRoomInvitations();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const label = t(pending ? "gatherings.inviting" : "gatherings.invite");
  const invite = async () => {
    if (inFlight.current || !canInviteParticipants()) return;
    inFlight.current = true;
    setPending(true);
    onErrorChange(false);
    try {
      await inviteParticipants();
    } catch {
      onErrorChange(true);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          className={`${CHAT_GATHERING_ACTION_CLASS} ll:w-6`}
          aria-label={label}
          aria-busy={pending}
          disabled={pending || !canInviteParticipants()}
          onClick={() => void invite()}
        >
          {pending ? (
            <LoaderCircle size={14} aria-hidden="true" />
          ) : (
            <UserPlus size={14} aria-hidden="true" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
