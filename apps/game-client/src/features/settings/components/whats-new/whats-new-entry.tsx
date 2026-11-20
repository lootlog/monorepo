import type { ChangelogItem } from "@lootlog/changelog/changelog";
import { docsPageUrl } from "@lootlog/domain/public-sites";
import { cn } from "cn";
import { useTranslation } from "react-i18next";

type WhatsNewEntryProps = {
  item: ChangelogItem;
  isUnread: boolean;
};

/** One feature or improvement, with where the player meets it. */
export const WhatsNewEntry = ({ item, isUnread }: WhatsNewEntryProps) => {
  const { t } = useTranslation();

  return (
    <article className="ll:flex ll:flex-col ll:gap-1 ll:px-2 ll:py-1.5">
      <div className="ll:flex ll:items-center ll:gap-2">
        <span
          className={cn(
            "ll:shrink-0 ll:rounded-full ll:px-2 ll:text-[11px] ll:font-semibold ll:leading-[18px]",
            item.type === "feature"
              ? "ll:bg-primary ll:text-primary-foreground"
              : "ll:bg-muted ll:text-foreground",
          )}
        >
          {t(`settings.whatsNew.types.${item.type}`)}
        </span>
        <span className="ll:min-w-0 ll:truncate ll:text-xs ll:text-muted-foreground">
          {item.surfaces
            .map((surface) => t(`settings.whatsNew.surfaces.${surface}`))
            .join(" · ")}
        </span>
        {isUnread ? (
          <>
            <span
              aria-hidden="true"
              className="ll:ml-auto ll:size-2 ll:shrink-0 ll:rounded-full ll:bg-amber-400"
            />
            <span className="ll:sr-only">{t("settings.whatsNew.unread")}</span>
          </>
        ) : null}
      </div>
      <h4 className="ll:m-0 ll:text-[13px] ll:font-semibold ll:leading-[18px] ll:text-pretty ll:text-foreground">
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
          className="ll:self-start ll:text-xs ll:font-semibold ll:text-muted-foreground ll:underline-offset-2 ll:hover:text-foreground ll:hover:underline"
        >
          {t("settings.whatsNew.howItWorks")}
        </a>
      ) : null}
    </article>
  );
};
