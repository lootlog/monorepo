import { createFileRoute } from "@tanstack/react-router";
import { MyReservations } from "@/features/user/reservations/my-reservations";
import { parseMyReservationsSearch } from "@/features/user/reservations/my-reservations-search";
import { ROUTES } from "@/config/routes";

export const Route = createFileRoute("/_authenticated/@me/reservations")({
  staticData: {
    navigation: ({ t }) => ({
      ancestors: [
        {
          label: t("layout.navigation.dashboard"),
          path: ROUTES.user.dashboard,
        },
      ],
      label: t("layout.navigation.myReservations"),
    }),
  },
  validateSearch: parseMyReservationsSearch,
  component: MyReservations,
});
