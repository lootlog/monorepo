import type { ChangelogItem } from "@lootlog/changelog/changelog";
import { docsPageUrl } from "@lootlog/domain/public-sites";
import { Badge } from "@lootlog/ui/components/badge";
import { TextLink } from "@lootlog/ui/components/text-link";
import { useTranslation } from "react-i18next";
import { UnreadDot } from "./unread-dot";

type WhatsNewEntryProps = {
  item: ChangelogItem;
  isUnread: boolean;
};

/** One feature or improvement, with where the player meets it. */
export const WhatsNewEntry = ({ item, isUnread }: WhatsNewEntryProps) => {
  const { t } = useTranslation();

  return (
    <article className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Badge variant={item.type === "feature" ? "default" : "secondary"}>
          {t(`layout.whatsNew.types.${item.type}`)}
        </Badge>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {item.surfaces
            .map((surface) => t(`layout.whatsNew.surfaces.${surface}`))
            .join(" · ")}
        </span>
        {isUnread && (
          <>
            <UnreadDot className="ml-auto" />
            <span className="sr-only">{t("layout.whatsNew.unread")}</span>
          </>
        )}
      </div>
      <h3 className="text-sm font-medium leading-snug text-pretty">
        {item.title}
      </h3>
      {item.summary && (
        <p className="text-sm leading-snug text-pretty text-muted-foreground">
          {item.summary}
        </p>
      )}
      {item.docs && (
        <TextLink
          href={docsPageUrl(item.docs)}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start"
        >
          {t("layout.whatsNew.howItWorks")}
          <span className="sr-only">{t("ui.externalLink.newTab")}</span>
        </TextLink>
      )}
    </article>
  );
};
