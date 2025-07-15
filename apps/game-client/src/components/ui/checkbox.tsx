import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  labelClassName?: string;
  labelStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  children,
  value,
  labelClassName,
  labelStyle,
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
        className={cn(
          "c-checkbox__label--highlight",
          {
            "!ll-cursor-not-allowed": props.disabled,
            "!ll-text-gray-500": props.disabled,
          },
          labelClassName
        )}
        style={labelStyle}
      >
        {children}
      </label>
    </div>
  );
};
