import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";

export const textLinkClassName =
  "cursor-pointer rounded-sm text-xs font-semibold text-muted-foreground no-underline outline-none transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none";

export function TextLink({
  render,
  className,
  ...props
}: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    render,
    state: { slot: "text-link" },
    props: mergeProps<"a">(
      { className: cn(textLinkClassName, className) },
      props,
    ),
  });
}
