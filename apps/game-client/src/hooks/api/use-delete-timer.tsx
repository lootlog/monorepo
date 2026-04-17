import { useMutation } from "@tanstack/react-query";
import { deleteTimer, type DeleteTimerOptions } from "@/api";

export type UseDeleteTimerOptions = DeleteTimerOptions;

export const useDeleteTimer = () => {
  const mutation = useMutation({
    mutationKey: ["delete-timer"],
    mutationFn: (options: DeleteTimerOptions) => deleteTimer(options),
  });

  return mutation;
};
