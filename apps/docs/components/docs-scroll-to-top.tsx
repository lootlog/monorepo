"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function DocsScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hash) return;

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
