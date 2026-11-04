import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@lootlog/ui/components/card";

/** A card whose title links to a page; the whole card is the hit area. */
export function ResourceCard({
  icon,
  title,
  description,
  link,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  link: Pick<LinkProps, "to" | "params" | "hash">;
}) {
  return (
    <Card
      variant="interactive"
      className="group/resource gap-3 px-5 focus-within:border-ring"
    >
      {icon && (
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-secondary text-signal-live [&_svg]:size-4"
        >
          {icon}
        </span>
      )}
      <h3 className="text-[0.9375rem] font-semibold tracking-tight">
        <Link
          {...link}
          className="inline-flex items-center gap-1 outline-none after:absolute after:inset-0 after:rounded-xl"
        >
          {title}
          <ChevronRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-[translate,color] duration-150 ease-emphasized group-hover/resource:translate-x-0.5 group-hover/resource:text-foreground motion-reduce:transition-none"
          />
        </Link>
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Card>
  );
}
