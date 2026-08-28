import { useId, type ReactNode } from "react";

interface ThemeGallerySectionProps {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}

export const ThemeGallerySection = ({
  title,
  description,
  children,
  action,
}: ThemeGallerySectionProps) => {
  const sectionId = useId();

  return (
    <section className="space-y-3" aria-labelledby={sectionId}>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 id={sectionId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};
