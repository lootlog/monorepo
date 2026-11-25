import { Swords } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { t } from "@/i18n/messages";

export function FightEmptyState({
  canSimulate,
  onSimulate,
}: {
  canSimulate: boolean;
  onSimulate: () => void;
}) {
  return (
    <EmptyState
      icon={Swords}
      title={t("fightPage.emptyTitle")}
      description={
        canSimulate
          ? t("fightPage.notSimulated")
          : t("fightPage.missingProfession")
      }
      action={
        canSimulate ? (
          <Button size="sm" onClick={onSimulate}>
            <Swords aria-hidden="true" />
            {t("fightPage.simulate")}
          </Button>
        ) : null
      }
    />
  );
}
