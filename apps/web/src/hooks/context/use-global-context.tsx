import { GlobalContext } from "@/contexts/global-context";
import { useContext } from "react";

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error("GlobalContextProvider is required");
  return context;
};
