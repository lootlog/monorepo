import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";

// A slot that only allows phrasing content (`<p>`, headings) needs
// `render={<span />}` with a `block` class.
function Skeleton({
  render,
  className,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    render,
    state: { slot: "skeleton" },
    props: mergeProps<"div">(
      {
        className: cn("bg-secondary animate-skeleton rounded-md", className),
      },
      props,
    ),
  });
}

export { Skeleton };
