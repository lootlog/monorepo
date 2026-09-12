import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "cn";

type SwitchProps = BaseSwitch.Root.Props & {
  size?: "sm" | "default";
};

function Switch({ className, size = "sm", ...props }: SwitchProps) {
  return (
    <BaseSwitch.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "ll:peer ll:group/switch ll:relative ll:inline-flex ll:shrink-0 ll:items-center ll:rounded-full ll:border ll:border-transparent ll:transition-all ll:outline-none ll:group-focus-within/field-label:border-transparent ll:group-focus-within/field-label:ring-0 ll:after:absolute ll:after:-inset-x-3 ll:after:-inset-y-2 ll:focus-visible:border-ring ll:focus-visible:ring-3 ll:focus-visible:ring-ring/50 ll:aria-invalid:border-destructive ll:aria-invalid:ring-3 ll:aria-invalid:ring-destructive/20 ll:data-[size=default]:h-[18.4px] ll:data-[size=default]:w-[32px] ll:data-[size=sm]:h-[14px] ll:data-[size=sm]:w-[24px] ll:dark:aria-invalid:border-destructive/50 ll:dark:aria-invalid:ring-destructive/40 ll:data-[checked]:bg-primary ll:data-[unchecked]:bg-input ll:dark:data-[unchecked]:bg-input/80 ll:data-[disabled]:cursor-not-allowed ll:data-[disabled]:opacity-50 ll-custom-cursor-pointer",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        data-slot="switch-thumb"
        className="ll:pointer-events-none ll:block ll:rounded-full ll:bg-background ll:ring-0 ll:transition-transform ll:group-data-[size=default]/switch:size-4 ll:group-data-[size=sm]/switch:size-3 ll:group-data-[size=default]/switch:data-[checked]:translate-x-[calc(100%-2px)] ll:group-data-[size=sm]/switch:data-[checked]:translate-x-[calc(100%-2px)] ll:dark:data-[checked]:bg-primary-foreground ll:group-data-[size=default]/switch:data-[unchecked]:translate-x-0 ll:group-data-[size=sm]/switch:data-[unchecked]:translate-x-0 ll:dark:data-[unchecked]:bg-foreground"
      />
    </BaseSwitch.Root>
  );
}

export { Switch };
