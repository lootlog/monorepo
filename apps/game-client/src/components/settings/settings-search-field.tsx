import { SearchInput } from "@/components/ui/search-input";
import type { FC, KeyboardEventHandler, RefObject } from "react";

type SettingsSearchFieldProps = {
  value: string;
  placeholder: string;
  label: string;
  clearLabel: string;
  inputRef: RefObject<HTMLInputElement | null>;
  listboxId: string;
  activeOptionId?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onKeyDown: KeyboardEventHandler<HTMLInputElement>;
};

/** Settings search box: the shared SearchInput wired as a combobox. */
export const SettingsSearchField: FC<SettingsSearchFieldProps> = ({
  value,
  placeholder,
  label,
  clearLabel,
  inputRef,
  listboxId,
  activeOptionId,
  onChange,
  onClear,
  onKeyDown,
}) => (
  <SearchInput
    ref={inputRef}
    className="ll:shrink-0 ll:flex-none"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    aria-label={label}
    aria-controls={value ? listboxId : undefined}
    aria-activedescendant={value ? activeOptionId : undefined}
    onClear={onClear}
    clearLabel={clearLabel}
  />
);
