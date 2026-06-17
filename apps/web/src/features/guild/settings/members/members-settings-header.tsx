import { RefreshMembersButton } from "@/features/guild/settings/members/components/refresh-members-button";
import type { MembersStats } from "@/features/guild/settings/members/members.types";
import { Card } from "@lootlog/ui/components/card";
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
    <Card className="shrink-0 px-5 py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
            <Users className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="mb-1 text-base font-semibold leading-tight">
              {t("settings.members.title")}
            </h2>
            <p className="text-xs leading-tight text-muted-foreground">
              {t("settings.members.description")}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-tight text-muted-foreground">
              <span>{summaryItems.join(" · ")}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                className="inline-flex h-5 items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 text-[11px] font-medium text-amber-500 transition-colors hover:bg-amber-500/15"
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
    </Card>
  );
};
