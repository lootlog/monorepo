import {
  formatChangelogDay,
  type ChangelogEntryType,
  type ChangelogItem,
} from "@lootlog/changelog/changelog";
import { docsPageUrl } from "@lootlog/domain/public-sites";
import { cn } from "cn";
import { useTranslation } from "react-i18next";

type WhatsNewEntryProps = {
  item: ChangelogItem;
  isUnread: boolean;
};

// Each type keeps a look that stands out from the window on every theme: a
// fill for what is new, a frame for what got better, a quiet frame for a fix.
const TYPE_BADGE_CLASSES = {
  feature: "ll:border-primary ll:bg-primary ll:text-primary-foreground",
  improvement: "ll:border-foreground/40 ll:text-foreground",
  fix: "ll:border-border ll:text-muted-foreground",
} satisfies Record<ChangelogEntryType, string>;

/**
 * One change, ruled off from the next: what kind it is and when it shipped,
 * then what the player can do now and where.
 */
export const WhatsNewEntry = ({ item, isUnread }: WhatsNewEntryProps) => {
  const { t, i18n } = useTranslation();

  return (
    <article className="ll:flex ll:flex-col ll:gap-1.5 ll:border-b ll:border-border ll:px-2 ll:py-2.5 ll:last:border-b-0">
      <div className="ll:flex ll:items-center ll:gap-2">
        <span
          className={cn(
            "ll:shrink-0 ll:rounded-full ll:border ll:px-2 ll:text-[11px] ll:font-semibold ll:leading-[18px]",
            TYPE_BADGE_CLASSES[item.type],
          )}
        >
          {t(`settings.whatsNew.types.${item.type}`)}
        </span>
        <span className="ll:min-w-0 ll:truncate ll:text-xs ll:text-muted-foreground">
          {item.surfaces
            .map((surface) => t(`settings.whatsNew.surfaces.${surface}`))
            .join(" · ")}
        </span>
        <time
          dateTime={item.date}
          className="ll:ml-auto ll:shrink-0 ll:text-xs ll:tabular-nums ll:text-muted-foreground"
        >
          {formatChangelogDay(item.date, i18n.language)}
        </time>
      </div>
      <h4 className="ll:m-0 ll:flex ll:items-baseline ll:gap-1.5 ll:text-[13px] ll:font-semibold ll:leading-[18px] ll:text-pretty ll:text-foreground">
        {isUnread ? (
          <>
            <span
              aria-hidden="true"
              className="ll:size-2 ll:shrink-0 ll:rounded-full ll:bg-amber-400"
            />
            <span className="ll:sr-only">{t("settings.whatsNew.unread")}</span>
          </>
        ) : null}
        {item.title}
      </h4>
      {item.summary ? (
        <p className="ll:m-0 ll:text-xs ll:leading-[17px] ll:text-pretty ll:text-muted-foreground">
          {item.summary}
        </p>
      ) : null}
      {item.docs ? (
        <a
          href={docsPageUrl(item.docs)}
          target="_blank"
          rel="noopener noreferrer"
          className="ll:self-start ll:text-xs ll:font-semibold ll:text-foreground ll:underline ll:underline-offset-2 ll:hover:text-primary"
        >
          {t("settings.whatsNew.howItWorks")}
        </a>
      ) : null}
    </article>
  );
};
