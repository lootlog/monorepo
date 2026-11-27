import {
  getBingoControllerListBoardsQueryKey,
  useBingoControllerCreateBoard,
  type CreateBingoBoardDtoMode,
} from "@lootlog/client/main";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { OptionCardGroup } from "@lootlog/ui/components/option-card-group";
import { Switch } from "@lootlog/ui/components/switch";
import { Textarea } from "@lootlog/ui/components/textarea";
import { toast } from "@lootlog/ui/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Grid3x3 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

type BingoCreateDialogProps = {
  readonly guildId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated: (boardId: string) => void;
};

export const BingoCreateDialog = ({
  guildId,
  open,
  onOpenChange,
  onCreated,
}: BingoCreateDialogProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createBoard = useBingoControllerCreateBoard();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [world, setWorld] = useState("");
  const [mode, setMode] = useState<CreateBingoBoardDtoMode>("RACE");
  const [pointsPerTile, setPointsPerTile] = useState(1);
  const [pointsPerLine, setPointsPerLine] = useState(5);
  const [firstCompleterBonus, setFirstCompleterBonus] = useState(0);
  const [blackoutBonus, setBlackoutBonus] = useState(10);
  const [populateStarterTiles, setPopulateStarterTiles] = useState(true);

  const nameId = useId();
  const descId = useId();
  const worldId = useId();
  const starterId = useId();

  const reset = () => {
    setName("");
    setDescription("");
    setWorld("");
    setMode("RACE");
    setPointsPerTile(1);
    setPointsPerLine(5);
    setFirstCompleterBonus(0);
    setBlackoutBonus(10);
    setPopulateStarterTiles(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) return;

    try {
      const created = await createBoard.mutateAsync({
        pathParams: { guildId },
        data: {
          name: trimmedName,
          description: description.trim() || null,
          world: world.trim() || null,
          mode,
          pointsPerTile,
          pointsPerLine,
          firstCompleterBonus,
          blackoutBonus,
          populateStarterTiles,
        },
      });

      await queryClient.invalidateQueries({
        queryKey: getBingoControllerListBoardsQueryKey({ guildId }),
      });

      toast.success(t("bingo.toasts.created"));
      reset();
      onOpenChange(false);
      onCreated(created.board.id);
    } catch {
      toast.error(t("bingo.toasts.error"));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!createBoard.isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <IconDialogHeader
          icon={Grid3x3}
          title={t("bingo.createDialog.title")}
          description={t("bingo.createDialog.description")}
        />
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="space-y-4 overflow-y-auto p-5">
            <div className="space-y-1.5">
              <Label htmlFor={nameId}>{t("bingo.createDialog.name")}</Label>
              <Input
                id={nameId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("bingo.createDialog.namePlaceholder")}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={descId}>
                {t("bingo.createDialog.descriptionLabel")}
              </Label>
              <Textarea
                id={descId}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("bingo.createDialog.descriptionPlaceholder")}
                maxLength={500}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={worldId}>{t("bingo.createDialog.world")}</Label>
              <Input
                id={worldId}
                value={world}
                onChange={(event) => setWorld(event.target.value)}
                placeholder={t("bingo.createDialog.worldPlaceholder")}
                maxLength={64}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("bingo.createDialog.mode")}</Label>
              <OptionCardGroup
                value={mode}
                onChange={setMode}
                options={[
                  {
                    value: "RACE",
                    title: t("bingo.mode.RACE"),
                    description: t("bingo.modeDescription.RACE"),
                  },
                  {
                    value: "LOCKOUT",
                    title: t("bingo.mode.LOCKOUT"),
                    description: t("bingo.modeDescription.LOCKOUT"),
                  },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>{t("bingo.createDialog.pointsPerTile")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={pointsPerTile}
                  onChange={(event) =>
                    setPointsPerTile(
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("bingo.createDialog.pointsPerLine")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={pointsPerLine}
                  onChange={(event) =>
                    setPointsPerLine(
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("bingo.createDialog.firstCompleterBonus")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={firstCompleterBonus}
                  onChange={(event) =>
                    setFirstCompleterBonus(
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("bingo.createDialog.blackoutBonus")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={blackoutBonus}
                  onChange={(event) =>
                    setBlackoutBonus(
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <Label htmlFor={starterId} className="cursor-pointer text-sm">
                {t("bingo.createDialog.populateStarter")}
              </Label>
              <Switch
                id={starterId}
                checked={populateStarterTiles}
                onCheckedChange={setPopulateStarterTiles}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createBoard.isPending}
            >
              {t("bingo.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createBoard.isPending || !name.trim()}
            >
              {createBoard.isPending
                ? t("bingo.actions.creating")
                : t("bingo.actions.createBoard")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
