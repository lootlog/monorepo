import { UserHeaderActionsContext } from "@/contexts/user-header-actions-context";
import { useContext } from "react";

export const useUserHeaderActionsTarget = () => {
  return useContext(UserHeaderActionsContext);
};
