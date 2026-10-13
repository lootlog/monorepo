import {
  HeaderSlotsContext,
  type HeaderSlots,
} from "@/contexts/header-slots-context";
import { useContext } from "react";

export const useHeaderSlot = (slot: keyof HeaderSlots) => {
  return useContext(HeaderSlotsContext)[slot];
};
