import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const toggleVariants = cva(
  "ll:group/toggle ll:inline-flex ll:items-center ll:justify-center ll:gap-1 ll:rounded-sm ll:text-sm ll:font-medium ll:whitespace-nowrap ll:transition-all ll:outline-none ll:hover:bg-muted ll:hover:text-foreground ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50 ll:disabled:pointer-events-none ll:disabled:opacity-50 ll:aria-invalid:border-destructive ll:aria-invalid:ring-destructive/20 ll:aria-pressed:bg-muted ll:data-[state=on]:bg-muted ll:dark:aria-invalid:ring-destructive/40 ll:[&_svg]:pointer-events-none ll:[&_svg]:shrink-0 ll:[&_svg:not([class*=size-])]:size-4 ll-custom-cursor-pointer",
  {
    variants: {
      variant: {
        default: "ll:bg-transparent",
        outline:
          "ll:border ll:border-input ll:bg-transparent ll:hover:bg-muted",
      },
      size: {
        default:
          "ll:h-8 ll:min-w-8 ll:px-2.5 ll:has-data-[icon=inline-end]:pr-2 ll:has-data-[icon=inline-start]:pl-2",
        sm: "ll:h-7 ll:min-w-7 ll:rounded-sm ll:px-2.5 ll:text-[0.8rem] ll:has-data-[icon=inline-end]:pr-1.5 ll:has-data-[icon=inline-start]:pl-1.5 ll:[&_svg:not([class*=size-])]:size-3.5",
        lg: "ll:h-9 ll:min-w-9 ll:px-2.5 ll:has-data-[icon=inline-end]:pr-2 ll:has-data-[icon=inline-start]:pl-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: BaseToggle.Props & VariantProps<typeof toggleVariants>) {
  return (
    <BaseToggle
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
