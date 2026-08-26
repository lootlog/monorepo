import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getListMyReservationsQueryKey,
  useDeleteMyReservation,
} from "@lootlog/api-client/react-query/main/reservations";
import { getReservationErrorMessage } from "@/features/guild/reservations/get-reservation-error-message";

export const useCancelMyReservation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useDeleteMyReservation({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getListMyReservationsQueryKey(),
        });
        toast.success(t("reservations.details.cancelled"));
      },
      onError: (error) => toast.error(getReservationErrorMessage(error, t)),
    },
  });
};
