import { DETAIL_BAR_TOOLBAR_CELL_CLASS } from "@/components/common/detail-bar";
import type { Battle, RawBattle } from "@/lib/api/battlelog-types";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import { Clapperboard } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BattleReplayStudio } from "./battle-replay-studio";

type BattleReplayDialogProps = {
  readonly battle: Battle;
  readonly rawBattle: RawBattle;
};

export function BattleReplayDialog({
  battle,
  rawBattle,
}: BattleReplayDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            variant="chip"
            className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
          >
            <Clapperboard className="size-4" />
            {t("battlePanel.single.replay.openButton")}
          </Button>
        }
      />
      <DialogContent className="flex h-[90dvh] max-h-[920px] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-2rem)] xl:max-w-[1360px] max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none">
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3 pr-12">
          <DialogTitle className="px-0 pt-0 text-base">
            {t("battlePanel.single.replay.dialogTitle")}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <BattleReplayStudio battle={battle} rawBattle={rawBattle} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
