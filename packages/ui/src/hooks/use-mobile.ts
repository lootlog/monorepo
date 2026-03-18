import { useMaxWidth } from "./use-max-width.js";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  return useMaxWidth(MOBILE_BREAKPOINT);
}
