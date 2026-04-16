import { useMutation } from "@tanstack/react-query";
import { volunteer, type VolunteerOptions } from "@/api";

export type UseVolunteerOptions = VolunteerOptions;

export const useVolunteer = () => {
  return useMutation({
    mutationKey: ["volunteer"],
    mutationFn: (options: VolunteerOptions) => volunteer(options),
  });
};
