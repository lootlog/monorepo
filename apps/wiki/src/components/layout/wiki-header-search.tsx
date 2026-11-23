import { Search } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@lootlog/ui/components/button";
import { Kbd } from "@lootlog/ui/components/kbd";
import { getPrimaryModifierKeyLabel } from "@lootlog/ui/lib/primary-modifier-key";
import { t } from "@/i18n/messages";
import { WikiSearchDialog } from "./wiki-search-dialog";

const subscribeToPlatform = () => () => {};

const serverModifierKeyLabel = () => "Ctrl" as const;

export function WikiHeaderSearch({ variant }: { variant: "field" | "icon" }) {
  const [open, setOpen] = useState(false);

  const modifierKeyLabel = useSyncExternalStore(
    subscribeToPlatform,
    getPrimaryModifierKeyLabel,
    serverModifierKeyLabel,
  );

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
          className="portal-header-search h-8 w-56 justify-start font-normal lg:w-64"
        >
          <Search aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left">
            {t("header.searchPlaceholder")}
          </span>
          <Kbd>{`${modifierKeyLabel} K`}</Kbd>
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
