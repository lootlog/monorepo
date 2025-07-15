import { useWindowsStore } from "@/store/windows.store";
import { useEffect } from "react";

export const useHotkeys = () => {
  const { toggleOpen } = useWindowsStore();

  const handleKeyDown = (event: KeyboardEvent) => {
    const isInputActive = ["TEXTAREA", "MAGIC_INPUT", "INPUT"].includes(
      window.document.activeElement?.tagName ?? ""
    );
    if (isInputActive) return;

    // chat
    if (event.key === "S" && event.shiftKey) {
      event.preventDefault();
      toggleOpen("chat", true);
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
