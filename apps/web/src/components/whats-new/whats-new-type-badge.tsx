import type { ChangelogEntryType } from "@lootlog/changelog/changelog";
import { Badge, type BadgeProps } from "@lootlog/ui/components/badge";
import { useTranslation } from "react-i18next";

const TYPE_VARIANTS = {
  feature: "default",
  improvement: "ready",
  fix: "outline",
} satisfies Record<ChangelogEntryType, BadgeProps["variant"]>;

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
