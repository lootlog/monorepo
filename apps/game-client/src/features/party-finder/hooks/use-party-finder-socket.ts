import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import {
  usePartyFinderStore,
  type PartyFinderVolunteer,
} from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect } from "react";

type VolunteerPayload = {
  notificationId: string;
  volunteer: PartyFinderVolunteer;
};

export const usePartyFinderSocket = () => {
  const { socket, connected } = useSocket();
  const addVolunteer = usePartyFinderStore((s) => s.addVolunteer);
  const setOpen = useWindowsStore((s) => s.setOpen);

  useEffect(() => {
    if (!socket || !connected) return;

    const handler = (data: VolunteerPayload) => {
      addVolunteer(data.volunteer);
      setOpen("party-finder", true);
    };

    socket.on(GatewayEvent.NOTIFICATIONS_VOLUNTEER, handler);
    return () => {
      socket.off(GatewayEvent.NOTIFICATIONS_VOLUNTEER, handler);
    };
  }, [socket, connected, addVolunteer, setOpen]);
};
