import { PageHeader } from "@/components/common/page-header";
import { RefreshMembersButton } from "@/features/guild/settings/members/components/refresh-members-button";
import type { MembersStats } from "@/features/guild/settings/members/members.types";

import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

type MembersSettingsHeaderProps = MembersStats & {
  onProblemsClick: () => void;
};

export const MembersSettingsHeader = ({
  totalMembers,
  activeMembers,
  inactiveMembers,
  onlineMembers,
  problematicMembers,
  onProblemsClick,
}: MembersSettingsHeaderProps) => {
  const { t } = useTranslation();
  const summaryItems = [
    t("settings.members.summary.total", { count: totalMembers }),
    t("settings.members.summary.active", { count: activeMembers }),
    t("settings.members.summary.inactive", { count: inactiveMembers }),
    t("settings.members.summary.online", { count: onlineMembers }),
  ];

  return (
    <PageHeader
      title={t("settings.members.title")}
      icon={Users}
      description={t("settings.members.description")}
      actions={
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-tight text-muted-foreground">
                <span>{summaryItems.join(" ·")}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="inline-flex min-h-8 items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 text-[11px] font-medium text-amber-500 transition-colors hover:bg-amber-500/15"
                  onClick={onProblemsClick}
                >
                  {t("settings.members.summary.problems", {
                    count: problematicMembers,
                  })}
                </button>
              </div>
            </div>
          </div>
          <div className="flex w-full min-w-0 items-center xl:w-auto xl:justify-end">
            <RefreshMembersButton />
          </div>
        </div>
      }
    />
  );
};
