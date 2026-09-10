"use client";

import type { CSSPropertiesWithVariables } from "../types/css";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const style: CSSPropertiesWithVariables = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
};

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner theme="dark" className="toaster group" style={style} {...props} />
  );
};

export { Toaster };
