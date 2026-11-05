import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";

const variantClassNames = {
  bar: "text-sm font-medium outline-none transition-colors after:pointer-events-none after:absolute after:inset-x-1 after:inset-y-3 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring",
  menu: "flex h-10 items-center rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
};

const stateClassNames = {
  bar: {
    active: "text-foreground",
    idle: "text-muted-foreground hover:text-foreground",
  },
  menu: {
    active: "bg-accent text-foreground",
    idle: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  },
};

type PortalNavLinkProps = useRender.ComponentProps<"a"> & {
  active?: boolean;
  variant: keyof typeof variantClassNames;
};

export function PortalNavLink({
  active = false,
  variant,
  render,
  className,
  ...props
}: PortalNavLinkProps) {
  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        "aria-current": active ? "page" : undefined,
        className: cn(
          variantClassNames[variant],
          stateClassNames[variant][active ? "active" : "idle"],
          className,
        ),
      },
      props,
    ),
  });
}
