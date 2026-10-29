import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@lootlog/ui/components/input-group";
import { Kbd } from "@lootlog/ui/components/kbd";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

/** The site-wide item search; Ctrl+K or Cmd+K focuses it from any page. */
export function WikiHeaderSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", focusSearch);

    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void navigate({
      to: "/items",
      search: { ...EMPTY_ITEMS_SEARCH, query: query.trim() },
    });
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn("min-w-0", className)}
    >
      <InputGroup className="bg-background/60">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t("header.searchLabel")}
          placeholder={t("header.searchPlaceholder")}
        />
        <InputGroupAddon align="inline-end" className="max-sm:hidden">
          <Kbd>Ctrl K</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
