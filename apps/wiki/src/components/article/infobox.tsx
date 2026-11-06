import type { ReactNode } from "react";
import { cn } from "cn";

type InfoboxProps = {
  title: string;
  /** What the subject is, under its name. */
  subtitle?: ReactNode;
  /** The subject's picture, drawn under the title. */
  media?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * An article's fact box, as encyclopedias draw it: the subject's name, its
 * picture and its key facts in rows. It tints with `--infobox-accent`.
 */
export function Infobox({
  title,
  subtitle,
  media,
  children,
  className,
}: InfoboxProps) {
  return (
    <aside
      aria-label={title}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-[color-mix(in_oklab,var(--infobox-accent,var(--border))_35%,var(--border))] bg-card",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-0.5 border-b border-border/60 bg-[color-mix(in_oklab,var(--infobox-accent,var(--primary))_10%,var(--card))] px-4 py-3 text-center">
        <p className="text-[0.9375rem] font-semibold text-balance text-foreground">
          {title}
        </p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {media ? <div className="p-3 pb-0">{media}</div> : null}
      <div className="flex flex-col py-1.5">{children}</div>
    </aside>
  );
}
