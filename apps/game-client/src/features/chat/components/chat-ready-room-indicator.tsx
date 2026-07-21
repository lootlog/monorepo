import { Button } from "@/components/ui/button";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { useReadyRoomWithdrawal } from "@/features/party-finder/hooks/use-ready-room-withdrawal";
import {
  selectReadyRoomForCharacter,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export const ChatReadyRoomIndicator = () => {
  const { t } = useTranslation("chat");
  const { t: tPartyFinder } = useTranslation("partyFinder");
  const currentCharacterIdentity = getCurrentReadyRoomCharacterIdentity();
  const room = usePartyFinderStore((state) =>
    selectReadyRoomForCharacter(state, currentCharacterIdentity),
  );
  const { isWithdrawing, participant, withdraw } = useReadyRoomWithdrawal(room);

  if (!room || room.viewer !== "PARTICIPANT" || !participant) return null;

  const withdrawLabel = tPartyFinder("actions.withdraw");

  return (
    <div className="ll:mb-1 ll:flex ll:min-w-0 ll:items-center ll:gap-1.5 ll:rounded-sm ll:border ll:border-orange-500/50 ll:bg-orange-950/35 ll:px-1.5 ll:py-1">
      <div className="ll:min-w-0 ll:flex-1">
        <p className="ll:truncate ll:text-[10px] ll:font-semibold ll:text-orange-200">
          {t("partyGathering.registration.organizer", {
            organizer: room.organizerCharacter.nick,
          })}
        </p>
        <p className="ll:text-[9px] ll:text-gray-300">
          {tPartyFinder(`states.partyPresence.${participant.partyPresence}`)}
        </p>
      </div>
      <Button
        type="button"
        aria-label={withdrawLabel}
        title={withdrawLabel}
        disabled={isWithdrawing}
        onClick={() => void withdraw()}
        className="ll:h-6 ll:w-6 ll:shrink-0 ll:p-0 ll:border-red-500/50 ll:bg-red-600/10 ll:text-red-300 ll:hover:bg-red-600/25"
      >
        {isWithdrawing ? (
          <Loader2 className="ll:h-3 ll:w-3 ll:animate-spin" />
        ) : (
          <X className="ll:h-3 ll:w-3" />
        )}
      </Button>
    </div>
  );
};
