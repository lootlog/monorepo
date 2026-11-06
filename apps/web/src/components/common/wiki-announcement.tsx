import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { BookOpen, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { WIKI_URL } from "@/config/wiki";

const DISMISSED_STORAGE_KEY = "lootlog:announcement:wiki-launch:dismissed";

/** The bar that introduces the wiki until the player opens or hides it. */
export const WikiAnnouncement = () => {
  const [isDismissed, setIsDismissed] = useLocalStorage(
    DISMISSED_STORAGE_KEY,
    false,
  );

  const { t } = useTranslation();
  const titleId = useId();

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <section
      aria-labelledby={titleId}
      className="shrink-0 border-b border-border bg-card text-card-foreground"
    >
      <div className="flex w-full items-center justify-between gap-4 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
          >
            <BookOpen className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
            <span id={titleId} className="font-semibold whitespace-nowrap">
              {t("layout.wikiAnnouncement.title")}
            </span>
            <span className="truncate text-muted-foreground">
              {t("layout.wikiAnnouncement.description")}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            nativeButton={false}
            render={
              <a href={WIKI_URL} target="_blank" rel="noopener noreferrer" />
            }
            onClick={handleDismiss}
          >
            {t("layout.wikiAnnouncement.open")}
            <span className="sr-only">{t("ui.externalLink.newTab")}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("layout.wikiAnnouncement.dismiss")}
            // Its glyph, not its hit area, meets the bar's inset.
            className="-mr-2 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};
