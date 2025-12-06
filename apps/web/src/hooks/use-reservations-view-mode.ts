import { useLocalStorage } from "usehooks-ts";

export type ReservationsViewMode = "list" | "grid";

const RESERVATIONS_VIEW_MODE_KEY = "reservations-view-mode";

export const useReservationsViewMode = () => {
  const [viewMode, setViewMode] = useLocalStorage<ReservationsViewMode>(
    RESERVATIONS_VIEW_MODE_KEY,
    "grid",
  );

  return { viewMode, setViewMode };
};
