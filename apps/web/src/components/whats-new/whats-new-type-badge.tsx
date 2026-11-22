import type { ChangelogEntryType } from "@lootlog/changelog/changelog";
import { Badge, type BadgeProps } from "@lootlog/ui/components/badge";
import { useTranslation } from "react-i18next";

// Each type keeps a look that stands out from a popover, a tile and a band
// on every theme: a fill for what is new, a tinted frame for what got better.
const TYPE_VARIANTS = {
  feature: "default",
  improvement: "ready",
  fix: "outline",
} satisfies Record<ChangelogEntryType, BadgeProps["variant"]>;

/** Names what kind of change an entry is. */
export const WhatsNewTypeBadge = ({ type }: { type: ChangelogEntryType }) => {
  const { t } = useTranslation();

  return (
    <Badge
      variant={TYPE_VARIANTS[type]}
      className={type === "fix" ? "text-muted-foreground" : undefined}
    >
      {t(`layout.whatsNew.types.${type}`)}
    </Badge>
  );
};
