import { useMaxWidth } from "@lootlog/ui/hooks/use-max-width";

const LARGE_BREAKPOINT = 1024;

export function useLg() {
  return useMaxWidth(LARGE_BREAKPOINT);
}
