import type { Battle } from "@/lib/api/battlelog-types";
import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getRecentOpponentBattleContext } from "./recent-opponent-battle-context";
import { RecentOpponentBattlesList } from "./recent-opponent-battles-list";

type RecentOpponentBattlesCardProps = {
  battle: Battle | undefined;
  className?: string;
};

export function RecentOpponentBattlesCard({
  battle,
  className,
}: RecentOpponentBattlesCardProps) {
  const { t } = useTranslation();
  const context = getRecentOpponentBattleContext(battle);

  return (
    <Card
      className={cn(
        "flex max-h-[420px] min-h-0 w-full flex-col gap-0 overflow-hidden border-border bg-card p-0 xl:h-[var(--battle-side-card-height)] xl:max-h-none",
        className,
      )}
    >
      <div className="flex min-h-[61px] shrink-0 items-center border-b bg-background px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <History className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">
              {t("battlePanel.single.recentOpponent.title")}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {context
                ? t("battlePanel.single.recentOpponent.subtitle", {
                    opponent: context.opponentName,
                  })
                : t("battlePanel.single.recentOpponent.unsupported")}
            </p>
          </div>
        </div>
      </div>

      <RecentOpponentBattlesList battle={battle} />
    </Card>
  );
}
