import { useEffect, useRef, useState, type KeyboardEvent } from "react";

/** Long enough for a click on a suggestion to land before the list closes. */
const BLUR_CLOSE_DELAY_MS = 200;

/**
 * Open state and keyboard highlight of the suggestions under a text input:
 * arrows move the highlight, Enter picks it, and Escape closes the list
 * before it reaches whatever contains the input.
 */
export const useSuggestionList = <T>(items: readonly T[]) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const blurTimeout = blurTimeoutRef;

    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current);
    };
  }, []);

  const open = () => {
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const close = () => {
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const closeAfterBlur = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      blurTimeoutRef.current = null;
    }, BLUR_CLOSE_DELAY_MS);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    onSelect: (item: T) => void,
  ) => {
    if (event.nativeEvent.isComposing) return;

    if (items.length === 0) return;

    const selected = items[selectedIndex];

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
      setIsOpen(true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      setIsOpen(true);
    } else if (event.key === "Enter" && selected !== undefined) {
      event.preventDefault();
      onSelect(selected);
    } else if (event.key === "Escape" && isOpen) {
      // Escape dismisses the suggestions first; the next one reaches the panel.
      event.stopPropagation();
      close();
    }
  };

  return { isOpen, selectedIndex, open, close, closeAfterBlur, handleKeyDown };
};
