import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";

export function DocsScrollToTop() {
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    if (window.location.hash) return;

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
