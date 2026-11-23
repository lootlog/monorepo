import { useState } from "react";
import { useSuccessFlash } from "@/hooks/utils/use-success-flash";

export function useSelfAssignmentFlash(isAssignedToMe: boolean) {
  const assigned = useSuccessFlash();
  const [wasAssignedToMe, setWasAssignedToMe] = useState(isAssignedToMe);

  if (wasAssignedToMe !== isAssignedToMe) {
    setWasAssignedToMe(isAssignedToMe);

    if (isAssignedToMe) assigned.flash();
  }

  return assigned.shown;
}
