import { useTranslation } from "react-i18next";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { useWindowsStore } from "@/store/windows.store";
import { useReadyRoomWithdrawal } from "@/features/party-finder/hooks/use-ready-room-withdrawal";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { Button } from "@/components/ui/button";

export function ChatOwnGatheringBar({
  room,
  onError,
}: {
  room: PartyReadyRoomProjection;
  onError: () => void;
}) {
  const { t } = useTranslation("chat");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const cancellation = useCancelPartyGathering();
  const withdrawal = useReadyRoomWithdrawal(room);
  const organizer = room.viewer === "ORGANIZER";
  return (
    <div className="ll:flex ll:items-center ll:gap-1">
      <span className="ll:min-w-0 ll:flex-1 ll:truncate">
        {t(organizer ? "gatherings.owned" : "gatherings.applied")} ·{" "}
        {room.npc?.name ?? room.description ?? room.organizerCharacter.nick} ·{" "}
        {room.organizerCharacter.nick} · {room.world}
      </span>
      <Button onClick={() => setOpen("party-finder", true)}>
        {t("gatherings.manage")}
      </Button>
      <Button
        disabled={cancellation.isPending || withdrawal.isWithdrawing}
        onClick={() => {
          if (organizer) cancellation.mutate(undefined, { onError });
          else void withdrawal.withdraw()?.catch(onError);
        }}
      >
        {t(organizer ? "gatherings.cancel" : "gatherings.withdraw")}
      </Button>
    </div>
  );
}
