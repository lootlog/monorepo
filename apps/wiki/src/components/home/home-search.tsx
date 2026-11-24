import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@lootlog/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@lootlog/ui/components/input-group";
import { t } from "@/i18n/messages";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

export function HomeSearch() {
  const navigate = useNavigate();
  const inputId = useId();
  const [query, setQuery] = useState("");

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
      className="flex w-full max-w-xl gap-2"
      onSubmit={handleSubmit}
    >
      <label htmlFor={inputId} className="sr-only">
        {t("home.searchLabel")}
      </label>
      <InputGroup className="h-12 flex-1 bg-background/70 backdrop-blur">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("home.searchPlaceholder")}
          className="text-base"
        />
      </InputGroup>
      <Button type="submit" size="lg" className="h-12 px-5">
        {t("home.searchSubmit")}
      </Button>
    </form>
  );
}
