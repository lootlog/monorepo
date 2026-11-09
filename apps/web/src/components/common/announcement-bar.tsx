import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

type AnnouncementBarProps = {
  /** Remembers the dismissal; a new key shows the bar again to everyone. */
  dismissedStorageKey: string;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  dismissLabel: string;
};

/** The top bar announcement shown until the player follows or hides it. */
export const AnnouncementBar = ({
  dismissedStorageKey,
  icon,
  title,
  description,
  actionLabel,
  href,
  dismissLabel,
}: AnnouncementBarProps) => {
  const [isDismissed, setIsDismissed] = useLocalStorage(
    dismissedStorageKey,
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
      {/* Below lg the description takes its own row under the title and the
          actions, where it wraps in full; wide screens keep one line. */}
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center px-3 py-2.5 text-sm lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] sm:px-4">
        <div
          aria-hidden="true"
          className="mr-3 flex size-8 items-center justify-center rounded-full bg-accent text-primary"
        >
          {icon}
        </div>
        <span
          id={titleId}
          className="min-w-0 truncate font-semibold whitespace-nowrap"
        >
          {title}
        </span>
        <span className="col-span-2 col-start-2 row-start-2 mt-1 text-pretty text-muted-foreground lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:mt-0 lg:ml-2 lg:truncate">
          {description}
        </span>
        <div className="col-start-3 row-start-1 ml-4 flex items-center gap-2 lg:col-start-4">
          <Button
            size="sm"
            nativeButton={false}
            render={<a href={href} target="_blank" rel="noopener noreferrer" />}
            onClick={handleDismiss}
          >
            {actionLabel}
            <span className="sr-only">{t("ui.externalLink.newTab")}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={dismissLabel}
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
