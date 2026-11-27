import { BingoWindow } from "@/features/bingo/bingo-window";
import { useWindowPresence } from "@/hooks/ui/use-window-presence";
import { useWindowsStore } from "@/store/windows.store";

export const Bingo = () => {
  const open = useWindowsStore((state) => state.bingo.open);
  const { shouldRender } = useWindowPresence(open);

  return shouldRender ? <BingoWindow isOpen={open} /> : null;
};
