import type { ReactNode } from "react";

export interface MenuItem {
  active: boolean;
  label: string;
  icon: ReactNode;
  path: string;
  available: boolean;
  enabled: boolean;
  divided?: boolean;
  badge?: {
    content: string | number;
    variant?: "default" | "secondary" | "destructive" | "outline" | "white";
  };
  highlight?: boolean;
}
