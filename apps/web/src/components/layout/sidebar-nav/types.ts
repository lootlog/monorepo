import type { ReactNode } from "react";

export interface MenuItem {
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
  childPaths?: string[];
}
