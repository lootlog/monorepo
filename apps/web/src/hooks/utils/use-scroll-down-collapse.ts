import { useRef, useState } from "react";
import { useDocumentScrollListener } from "@/hooks/utils/use-page-scroll";

/** Near the top the page always shows its full chrome. */
const TOP_ZONE = 64;

/** Ignores the jitter of a resting finger and momentum's last pixels. */
const MIN_DELTA = 6;

/**
 * `true` while the reader scrolls the document down, `false` once they scroll
 * back up or reach the top. Only phones scroll the document, so wider layouts
 * never collapse.
 */
export const useScrollDownCollapse = () => {
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  useDocumentScrollListener(() => {
    const scrollY = window.scrollY;
    const delta = scrollY - lastScrollY.current;

    if (scrollY >= TOP_ZONE && Math.abs(delta) < MIN_DELTA) return;

    lastScrollY.current = scrollY;
    setCollapsed(scrollY >= TOP_ZONE && delta > 0);
  });

  return [collapsed, setCollapsed] as const;
};
