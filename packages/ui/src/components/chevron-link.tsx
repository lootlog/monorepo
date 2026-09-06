import type { useRender } from "@base-ui/react/use-render";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { TextLink } from "./text-link";

export function ChevronLink({
  className,
  children,
  ...props
}: useRender.ComponentProps<"a">) {
  return (
    <TextLink
      {...props}
      data-slot="chevron-link"
      className={cn(
        "group/chevron-link inline-flex min-h-8 shrink-0 items-center gap-1 text-sm",
        className,
      )}
    >
      {children}
      <ChevronRight
        aria-hidden
        className="size-3.5 shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover/chevron-link:translate-x-0.5 group-focus-visible/chevron-link:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
      />
    </TextLink>
  );
}
