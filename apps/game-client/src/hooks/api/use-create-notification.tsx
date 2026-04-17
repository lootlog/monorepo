import { useMutation } from "@tanstack/react-query";
import { createNotification, type CreateNotificationOptions } from "@/api";

export const useCreateNotification = () => {
  const mutation = useMutation({
    mutationKey: ["create-notification"],
    mutationFn: (options: CreateNotificationOptions) =>
      createNotification(options),
  });

  return mutation;
};
