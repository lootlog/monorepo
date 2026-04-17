import { useMutation } from "@tanstack/react-query";
import { resetTimer, type ResetTimerOptions } from "@/api";

export type UseResetTimerOptions = ResetTimerOptions;

export const useResetTimer = () => {
  const mutation = useMutation({
    mutationKey: ["reset-timer"],
    mutationFn: (options: ResetTimerOptions) => resetTimer(options),
  });

  return mutation;
};
