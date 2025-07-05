import { useWindowsStore } from "@/store/windows.store";
import { useEffect } from "react";

export const useHotkeys = () => {
  const { toggleOpen } = useWindowsStore();

  const handleKeyDown = (event: KeyboardEvent) => {
    // chat
    if (event.key === "S" && event.shiftKey) {
      event.preventDefault();
      toggleOpen("chat");
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
};
