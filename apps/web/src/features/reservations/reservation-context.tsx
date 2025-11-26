import { createContext, useContext } from "react";

type ReservationsContextValue = {
  canModerate: boolean;
  currentUserId: string | null;
};

const ReservationsContext = createContext<ReservationsContextValue | undefined>(
  undefined,
);

export const ReservationsContextProvider = ReservationsContext.Provider;

export const useReservationsContext = () => {
  const context = useContext(ReservationsContext);

  if (!context) {
    throw new Error(
      "useReservationsContext must be used within ReservationsContextProvider",
    );
  }

  return context;
};
