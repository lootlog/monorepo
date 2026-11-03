import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import { Kbd } from "@lootlog/ui/components/kbd";
import { t } from "@/i18n/messages";
import { WikiSearchDialog } from "./wiki-search-dialog";

/**
 * The site-wide search: a field-like button in a wide bar, an icon in a narrow
 * one. Ctrl+K or Cmd+K opens it from any page.
 */
export function WikiHeaderSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const toggleSearch = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", toggleSearch);

    return () => window.removeEventListener("keydown", toggleSearch);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="w-full max-w-80 justify-start bg-background/60 font-normal text-muted-foreground hover:text-foreground max-lg:hidden"
      >
        <Search aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">
          {t("header.searchPlaceholder")}
        </span>
        <Kbd>Ctrl K</Kbd>
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label={t("header.searchLabel")}
        className="bg-background/60 lg:hidden"
      >
        <Search aria-hidden="true" />
      </Button>
      <WikiSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
