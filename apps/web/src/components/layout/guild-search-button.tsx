import { Button } from "@lootlog/ui/components/button";
import { Kbd } from "@lootlog/ui/components/kbd";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPrimaryModifierKeyLabel } from "@/utils/platform/get-primary-modifier-key-label";

type GuildSearchButtonProps = {
  onClick: () => void;
};

/** Looks like a search field in a wide top bar and shrinks to an icon in a narrow one. */
export const GuildSearchButton = ({ onClick }: GuildSearchButtonProps) => {
  const { t } = useTranslation();
  // Phone bars drop control borders; their icons stand alone.
  const isMobile = useIsMobile();

  const shortcut = t("loots.header.shortcut", {
    modifier: getPrimaryModifierKeyLabel(),
  });

  return (
    <>
      <Button
        variant="outline"
        onClick={onClick}
        aria-keyshortcuts="Meta+K Control+K"
        className="w-72 justify-start font-normal text-muted-foreground hover:text-foreground @max-4xl/top-bar:hidden"
      >
        <Search aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">
          {t("layout.navigation.searchPlaceholder")}
        </span>
        <Kbd>{shortcut}</Kbd>
      </Button>
      <Button
        variant={isMobile ? "ghost" : "outline"}
        size="icon"
        onClick={onClick}
        aria-label={t("layout.navigation.search")}
        className="@4xl/top-bar:hidden"
      >
        <Search aria-hidden="true" />
      </Button>
    </>
  );
};
