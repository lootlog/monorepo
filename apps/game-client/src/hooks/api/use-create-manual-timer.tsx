import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createManualTimer, type CreateManualTimerOptions } from "@/api";
import { queryKeys } from "@/features/public-api/query-keys";

export const useCreateManualTimer = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["create-manual-timer"],
    mutationFn: (options: CreateManualTimerOptions) =>
      createManualTimer(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allTimers() });
    },
  });

  return mutation;
};
