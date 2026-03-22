"use client";

import "@/src/i18n/config";
import type { JSX, ReactNode } from "react";

export function I18nProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return <>{children}</>;
}
