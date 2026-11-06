import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import { Kbd } from "@lootlog/ui/components/kbd";
import { t } from "@/i18n/messages";
import { WikiSearchDialog } from "./wiki-search-dialog";

/**
 * The site-wide search: a field-like button in a wide bar, an icon in a
 * narrow one. The field also answers Ctrl+K or Cmd+K on any page.
 */
export function WikiHeaderSearch({ variant }: { variant: "field" | "icon" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (variant !== "field") return;

    const toggleSearch = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", toggleSearch);

    return () => window.removeEventListener("keydown", toggleSearch);
  }, [variant]);

  return (
    <>
      {variant === "field" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          aria-keyshortcuts="Control+K Meta+K"
          className="portal-header-search w-44 justify-start font-normal xl:w-72"
        >
          <Search aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left">
            {t("header.searchPlaceholder")}
          </span>
          <Kbd>Ctrl K</Kbd>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label={t("header.searchLabel")}
        >
          <Search aria-hidden="true" />
        </Button>
      )}
      <WikiSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
