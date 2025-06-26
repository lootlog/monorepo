import { cn } from "@/lib/utils";

export const Checkbox: React.FC<React.ComponentProps<"input">> = ({
  id,
  children,
  value,
  ...props
}) => {
  return (
    <div
      className={cn("checkbox-custom c-checkbox", {
        "!ll-text-gray-700": props.disabled,
        "!ll-cursor-not-allowed": props.disabled,
      })}
    >
      <input id={id} type="checkbox" value={value} {...props} />
      <label
        htmlFor={id}
        className={cn("c-checkbox__label--highlight", {
          "!ll-cursor-not-allowed": props.disabled,
          "!ll-text-gray-500": props.disabled,
        })}
      >
        {children}
      </label>
    </div>
  );
};
