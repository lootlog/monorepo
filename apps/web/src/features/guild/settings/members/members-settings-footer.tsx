import type { MembersStats } from "@/features/guild/settings/members/members.types";

import { useTranslation } from "react-i18next";

type MembersSettingsFooterProps = MembersStats & {
  onProblemsClick: () => void;
};

export const MembersSettingsFooter = ({
  totalMembers,
  activeMembers,
  inactiveMembers,
  onlineMembers,
  problematicMembers,
  onProblemsClick,
}: MembersSettingsFooterProps) => {
  const { t } = useTranslation();
  const summaryItems = [
    t("settings.members.summary.total", { count: totalMembers }),
    t("settings.members.summary.active", { count: activeMembers }),
    t("settings.members.summary.inactive", { count: inactiveMembers }),
    t("settings.members.summary.online", { count: onlineMembers }),
  ];

  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border/70 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
      <span>{summaryItems.join(" · ")}</span>
      <button
        type="button"
        className="inline-flex min-h-8 items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onProblemsClick}
      >
        {t("settings.members.summary.problems", { count: problematicMembers })}
      </button>
    </footer>
  );
};
