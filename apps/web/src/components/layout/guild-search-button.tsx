import { Button } from "@lootlog/ui/components/button";
import { Kbd } from "@lootlog/ui/components/kbd";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPrimaryModifierKeyLabel } from "@/utils/platform/get-primary-modifier-key-label";

type GuildSearchButtonProps = {
  onClick: () => void;
};

/** Looks like a search field on desktop and shrinks to an icon on phones. */
export const GuildSearchButton = ({ onClick }: GuildSearchButtonProps) => {
  const { t } = useTranslation();

  const shortcut = t("loots.header.shortcut", {
    modifier: getPrimaryModifierKeyLabel(),
  });

  return (
    <>
      <Button
        variant="outline"
        onClick={onClick}
        aria-keyshortcuts="Meta+K Control+K"
        className="w-72 justify-start rounded-lg border-border bg-card font-normal text-muted-foreground hover:border-foreground/20 hover:bg-card hover:text-foreground max-md:hidden"
      >
        <Search aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">
          {t("layout.navigation.searchPlaceholder")}
        </span>
        <Kbd>{shortcut}</Kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClick}
        aria-label={t("layout.navigation.search")}
        className="md:hidden"
      >
        <Search aria-hidden="true" />
      </Button>
    </>
  );
};
