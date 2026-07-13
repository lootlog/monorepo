import { useEffect } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import {
  type NotificationVolunteer,
  useNotificationVolunteersStore,
} from "@/store/notification-volunteers.store";

type VolunteerPayload = {
  notificationId: string;
  volunteer: NotificationVolunteer;
};

export function useNotificationVolunteersSocket(): void {
  const { socket, connected } = useSocket();
  const addVolunteer = useNotificationVolunteersStore(
    (state) => state.addVolunteer,
  );

  useEffect(() => {
    if (!socket || !connected) return;
    const handleVolunteer = (data: VolunteerPayload) => {
      addVolunteer(data.volunteer);
    };
    socket.on(GatewayEvent.NOTIFICATIONS_VOLUNTEER, handleVolunteer);
    return () => {
      socket.off(GatewayEvent.NOTIFICATIONS_VOLUNTEER, handleVolunteer);
    };
  }, [socket, connected, addVolunteer]);
}
