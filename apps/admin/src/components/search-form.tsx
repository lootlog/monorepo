import {
  INLINE_SEARCH_INPUT_CLASS,
  InlineSearchField,
} from "@lootlog/ui/components/inline-search-field";
import { useRef } from "react";
import { text } from "@/lib/messages";

export function SearchForm({
  value,
  placeholder,
  onSearch,
}: {
  value: string | undefined;
  placeholder: string;
  onSearch: (value: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      key={value ?? ""}
      role="search"
      className="flex min-w-48 flex-1"
      onSubmit={(event) => {
        event.preventDefault();

        const next = inputRef.current?.value.trim() ?? "";

        onSearch(next === "" ? undefined : next);
      }}
    >
      <InlineSearchField
        clearLabel={text.filterSearchClear}
        onClear={value === undefined ? undefined : () => onSearch(undefined)}
      >
        <input
          ref={inputRef}
          name="search"
          type="search"
          maxLength={100}
          aria-label={placeholder}
          placeholder={placeholder}
          defaultValue={value ?? ""}
          className={INLINE_SEARCH_INPUT_CLASS}
        />
      </InlineSearchField>
    </form>
  );
}
