import { Input, type InputVariant } from "@/components/ui/input";
import { cn } from "cn";
import type { FC, KeyboardEvent } from "react";
import { useSourceDraft } from "./use-source-draft";

type SettingsTextFieldProps = {
  id?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  variant?: InputVariant;
  "aria-label"?: string;
  className?: string;
  onCommit: (value: string) => void;
};

export const SettingsTextField: FC<SettingsTextFieldProps> = ({
  id,
  value,
  placeholder,
  disabled,
  variant = "default",
  "aria-label": ariaLabel,
  className,
  onCommit,
}) => {
  const [text, setText, clearDraft] = useSourceDraft(value, value);

  const commit = () => {
    clearDraft();

    if (text !== value) onCommit(text);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearDraft();
      event.currentTarget.blur();
    }
  };

  return (
    <Input
      id={id}
      type="text"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      variant={variant}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={cn(className)}
    />
  );
};
