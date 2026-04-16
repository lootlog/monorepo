import { useMutation } from "@tanstack/react-query";
import { createPartyGathering, type CreatePartyGatheringOptions } from "@/api";

export type UseCreatePartyGatheringOptions = CreatePartyGatheringOptions;

export const useCreatePartyGathering = () => {
  return useMutation({
    mutationKey: ["create-party-gathering"],
    mutationFn: (options: CreatePartyGatheringOptions) =>
      createPartyGathering(options),
  });
};
