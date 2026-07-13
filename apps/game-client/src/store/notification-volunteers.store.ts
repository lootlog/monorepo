import { storageKey } from "@/lib/storage-key";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const STORAGE_KEY = storageKey("ll-notification-volunteers-storage");

export type NotificationVolunteerNpc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  location: string;
  world: string;
  icon: string;
  x?: number;
  y?: number;
};

export type NotificationVolunteer = {
  discordId: string;
  nick: string;
  lvl: number;
  prof: string;
  characterId: string;
  accountId: string;
  icon: string;
  world: string;
  clan?: { id?: number; name?: string };
};

interface NotificationVolunteersState {
  notificationId: string | null;
  npc: NotificationVolunteerNpc | null;
  volunteers: NotificationVolunteer[];
  setNotification: (
    notificationId: string,
    npc: NotificationVolunteerNpc,
  ) => void;
  addVolunteer: (volunteer: NotificationVolunteer) => void;
  clear: () => void;
}

export const useNotificationVolunteersStore =
  create<NotificationVolunteersState>()(
    persist(
      (set) => ({
        notificationId: null,
        npc: null,
        volunteers: [],
        setNotification: (notificationId, npc) =>
          set({ notificationId, npc, volunteers: [] }),
        addVolunteer: (volunteer) =>
          set((state) => {
            if (
              state.volunteers.some(
                ({ characterId }) => characterId === volunteer.characterId,
              )
            ) {
              return state;
            }
            return { volunteers: [...state.volunteers, volunteer] };
          }),
        clear: () => set({ notificationId: null, npc: null, volunteers: [] }),
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => sessionStorage),
      },
    ),
  );
