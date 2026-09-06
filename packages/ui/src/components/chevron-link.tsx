import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";

export function ChevronLink({
  render,
  className,
  children,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    render,
    state: { slot: "chevron-link" },
    props: mergeProps<"a">(
      {
        className: cn(
          "group/chevron-link inline-flex min-h-8 shrink-0 items-center gap-1 rounded-sm text-xs font-semibold text-muted-foreground outline-none transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
          className,
        ),
        children: (
          <>
            {children}
            <ChevronRight
              aria-hidden
              className="size-3.5 shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover/chevron-link:translate-x-0.5 group-focus-visible/chevron-link:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
            />
          </>
        ),
      },
      props,
    ),
  });
}
