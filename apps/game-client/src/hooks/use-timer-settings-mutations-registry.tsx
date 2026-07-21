import { useEffect } from "react";
import { registerGlobalSettingsMutation } from "@/store/timer-settings-sync";
import { useUpdateTimerSettings } from "./api/use-timer-settings";

export const useTimerSettingsMutationsRegistry = () => {
  const { mutate: mutateGlobalSettings } = useUpdateTimerSettings();

  useEffect(
    () => registerGlobalSettingsMutation(mutateGlobalSettings),
    [mutateGlobalSettings],
  );
};
