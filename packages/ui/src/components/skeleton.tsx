import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";

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
