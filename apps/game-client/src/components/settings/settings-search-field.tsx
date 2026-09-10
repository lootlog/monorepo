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
      className="ll:pointer-events-none ll:absolute ll:start-1.5 ll:top-1/2 ll:size-3.5 ll:-translate-y-1/2 ll:text-muted-foreground"
      strokeWidth={1.5}
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
      className="ll:h-7 ll:w-full ll:rounded-sm ll:border ll:border-input ll:bg-transparent ll:dark:bg-input/30 ll:ps-6 ll:pe-6 ll:text-xs ll:text-foreground ll:outline-none ll:transition-[color,box-shadow] ll:placeholder:text-muted-foreground ll:focus-visible:border-ring ll:focus-visible:ring-[3px] ll:focus-visible:ring-ring/50"
    />
    {value ? (
      <button
        type="button"
        aria-label={clearLabel}
        onClick={onClear}
        className="ll-custom-cursor-pointer ll:absolute ll:end-1 ll:top-1/2 ll:flex ll:size-5 ll:-translate-y-1/2 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:text-muted-foreground ll:transition-[color,scale] ll:duration-150 ll:ease-out ll:hover:text-foreground ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:active:scale-[0.96]"
      >
        <X className="ll:size-3.5" strokeWidth={1.5} aria-hidden="true" />
      </button>
    ) : null}
  </div>
);
