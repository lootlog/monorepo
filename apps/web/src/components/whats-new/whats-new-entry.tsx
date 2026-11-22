import {
  formatChangelogDay,
  type ChangelogItem,
} from "@lootlog/changelog/changelog";
import { docsPageUrl } from "@lootlog/domain/public-sites";
import { TextLink } from "@lootlog/ui/components/text-link";
import { cn } from "cn";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { UnreadDot } from "./unread-dot";
import { WhatsNewSurfaces } from "./whats-new-surfaces";
import { WhatsNewTypeBadge } from "./whats-new-type-badge";

type WhatsNewEntryProps = {
  item: ChangelogItem;
  isUnread: boolean;
  className?: string;
};

export const WhatsNewEntry = ({
  item,
  isUnread,
  className,
}: WhatsNewEntryProps) => {
  const { t, i18n } = useTranslation();

  return (
    <article
      className={cn(
        "flex flex-col gap-2",
        isUnread && "bg-primary/5",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <WhatsNewTypeBadge type={item.type} />
        <time
          dateTime={item.date}
          className="shrink-0 text-xs text-muted-foreground tabular-nums"
        >
          {formatChangelogDay(item.date, i18n.language)}
        </time>
      </div>
      <div className="flex max-w-3xl min-w-0 flex-col gap-1.5">
        <h4 className="flex items-baseline gap-2 text-sm leading-snug font-medium text-pretty">
          {isUnread && (
            <>
              <UnreadDot className="translate-y-[-1px]" />
              <span className="sr-only">{t("layout.whatsNew.unread")}</span>
            </>
          )}
          {item.title}
        </h4>
        {item.summary && (
          <p className="text-sm leading-snug text-pretty text-muted-foreground">
            {item.summary}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-muted-foreground">
          <WhatsNewSurfaces surfaces={item.surfaces} />
          {item.docs && (
            <TextLink
              href={docsPageUrl(item.docs)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground"
            >
              {t("layout.whatsNew.howItWorks")}
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
              <span className="sr-only">{t("ui.externalLink.newTab")}</span>
            </TextLink>
          )}
        </div>
      </div>
    </article>
  );
};
