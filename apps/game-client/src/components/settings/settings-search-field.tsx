import { Search, X } from "lucide-react";
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
  <div className="ll:relative ll:shrink-0">
    <Search
      className="ll:pointer-events-none ll:absolute ll:left-1.5 ll:top-1/2 ll:size-3.5 ll:-translate-y-1/2 ll:text-muted-foreground"
      aria-hidden="true"
    />
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={label}
      aria-controls={value ? listboxId : undefined}
      aria-activedescendant={value ? activeOptionId : undefined}
      autoComplete="off"
      spellCheck={false}
      className="ll:h-7 ll:w-full ll:box-border ll:rounded-sm ll:border-0 ll:bg-black/25 ll:pl-6 ll:pr-6 ll:text-[11px] ll:text-gray-100 ll:outline-none ll:placeholder:text-muted-foreground ll:focus-visible:ring-1 ll:focus-visible:ring-inset ll:focus-visible:ring-ring"
    />
    {value ? (
      <button
        type="button"
        aria-label={clearLabel}
        onClick={onClear}
        className="ll-custom-cursor-pointer ll:absolute ll:right-1 ll:top-1/2 ll:flex ll:size-5 ll:-translate-y-1/2 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-muted-foreground ll:hover:text-gray-100 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
      >
        <X className="ll:size-3.5" aria-hidden="true" />
      </button>
    ) : null}
  </div>
);
