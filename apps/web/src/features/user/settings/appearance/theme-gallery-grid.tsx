import type { ReactNode } from "react";

interface ThemeGalleryGridProps {
  children: ReactNode;
}

export const ThemeGalleryGrid = ({ children }: ThemeGalleryGridProps) => (
  <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-4">
    {children}
  </div>
);
