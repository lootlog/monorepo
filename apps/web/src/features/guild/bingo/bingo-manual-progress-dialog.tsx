import {
  getBingoControllerGetBoardQueryKey,
  getBingoControllerListBoardsQueryKey,
  useBingoControllerUpdateTileProgress,
  useMembersControllerGetGuildMemberReferences,
  type BingoBoardDetailResponseDtoTilesItem,
  type UpdateBingoTileProgressDto,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { toast } from "@lootlog/ui/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

type BingoManualProgressDialogProps = {
  readonly guildId: string;
  readonly boardId: string;
  readonly tiles: ReadonlyArray<BingoBoardDetailResponseDtoTilesItem>;
  readonly initialTileId?: string | null;
  readonly initialMemberId?: number | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
};

type CompletedChoice = "auto" | "yes" | "no";

export const BingoManualProgressDialog = ({
  guildId,
  boardId,
  tiles,
  initialTileId,
  initialMemberId,
  open,
  onOpenChange,
}: BingoManualProgressDialogProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateProgress = useBingoControllerUpdateTileProgress();

  const { data: members } = useMembersControllerGetGuildMemberReferences(
    { guildId },
    { includeInactive: false },
    { query: { enabled: open && Boolean(guildId) } },
  );

  const [memberId, setMemberId] = useState(
    initialMemberId ? String(initialMemberId) : "",
  );

  const [tileId, setTileId] = useState(initialTileId ?? tiles[0]?.id ?? "");

  const [currentCount, setCurrentCount] = useState("1");

  const [completedChoice, setCompletedChoice] =
    useState<CompletedChoice>("yes");

  const [note, setNote] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const parsedMemberId = Number(memberId);

    if (!Number.isFinite(parsedMemberId) || parsedMemberId <= 0 || !tileId) {
      return;
    }

    const parsedCount = Number(currentCount);

    const requestBody: UpdateBingoTileProgressDto = {
      memberId: parsedMemberId,
      note: note.trim() || null,
    };

    if (Number.isFinite(parsedCount) && currentCount.trim() !== "") {
      requestBody.currentCount = Math.max(0, Math.trunc(parsedCount));
    }

    if (completedChoice === "yes") {
      requestBody.completed = true;
    } else if (completedChoice === "no") {
      requestBody.completed = false;
    }

    try {
      await updateProgress.mutateAsync({
        pathParams: { guildId, boardId, tileId },
        data: requestBody,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getBingoControllerListBoardsQueryKey({ guildId }),
        }),
        queryClient.invalidateQueries({
          queryKey: getBingoControllerGetBoardQueryKey({ guildId, boardId }),
        }),
      ]);

      toast.success(t("bingo.toasts.progressUpdated"));
      onOpenChange(false);
    } catch {
      toast.error(t("bingo.toasts.error"));
    }
  };

  const memberItems = (members ?? []).map((member) => ({
    value: String(member.id),
    label: member.name,
  }));

  const tileItems = tiles.map((tile) => ({
    value: tile.id,
    label: `R${tile.row + 1}C${tile.col + 1} · ${tile.title}`,
  }));

  const completedItems = [
    { value: "yes" as const, label: t("bingo.manualDialog.completedYes") },
    { value: "auto" as const, label: t("bingo.manualDialog.completedAuto") },
    { value: "no" as const, label: t("bingo.manualDialog.completedNo") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <IconDialogHeader
          icon={ClipboardCheck}
          title={t("bingo.manualDialog.title")}
          description={t("bingo.manualDialog.description")}
        />
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>{t("bingo.manualDialog.member")}</Label>
            <Select
              items={memberItems}
              value={memberId}
              onValueChange={(value) => setMemberId(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("bingo.manualDialog.memberPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {memberItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("bingo.manualDialog.tile")}</Label>
            <Select
              items={tileItems}
              value={tileId}
              onValueChange={(value) => setTileId(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("bingo.manualDialog.tilePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {tileItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("bingo.manualDialog.currentCount")}</Label>
              <Input
                type="number"
                min={0}
                max={100000}
                value={currentCount}
                onChange={(event) => setCurrentCount(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("bingo.manualDialog.completed")}</Label>
              <Select
                items={completedItems}
                value={completedChoice}
                onValueChange={(value) => {
                  if (value === "auto" || value === "yes" || value === "no") {
                    setCompletedChoice(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {completedItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("bingo.manualDialog.note")}</Label>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("bingo.manualDialog.notePlaceholder")}
              maxLength={200}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateProgress.isPending}
            >
              {t("bingo.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={updateProgress.isPending || !memberId || !tileId}
            >
              {t("bingo.manualDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
