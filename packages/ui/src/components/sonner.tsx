"use client";

import type { CSSPropertiesWithVariables } from "../types/css";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const style: CSSPropertiesWithVariables = {
    "--normal-bg": "var(--popover)",
    "--normal-text": "var(--popover-foreground)",
    "--normal-border": "var(--border)",
  };
  return (
    <Sonner theme="dark" className="toaster group" style={style} {...props} />
  );
};

export { Toaster };
