import { buildStarterBingoTiles } from "@lootlog/domain/bingo";
import {
  useBingoControllerReplaceTiles,
  useBingoControllerUpdateBoard,
  type BingoBoardDetailResponseDto,
  type BingoBoardDetailResponseDtoTilesItem,
  type ReplaceBingoTilesDtoTilesItem,
  type UpdateBingoBoardDtoMode,
  type UpdateBingoBoardDtoStatus,
} from "@lootlog/client/main";
import { ROUTES } from "@/config/routes";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { OptionCardGroup } from "@lootlog/ui/components/option-card-group";
import { PageHeader } from "@lootlog/ui/components/page-header";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { Textarea } from "@lootlog/ui/components/textarea";
import { toast } from "@lootlog/ui/lib/toast";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Save, Settings2, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { BingoBoardGrid } from "./bingo-board-grid";
import { BingoTileEditorDialog } from "./bingo-tile-editor-dialog";

const toEditableTiles = (
  tiles: ReadonlyArray<BingoBoardDetailResponseDtoTilesItem>,
): ReplaceBingoTilesDtoTilesItem[] =>
  tiles.map((tile) => ({
    row: tile.row,
    col: tile.col,
    title: tile.title,
    description: tile.description,
    points: tile.points,
    condition: tile.condition,
  }));

type BingoEditFormProps = {
  readonly guildId: string;
  readonly boardId: string;
  readonly data: BingoBoardDetailResponseDto;
  readonly onInvalidate: () => Promise<void>;
};

export const BingoEditForm = ({
  guildId,
  boardId,
  data,
  onInvalidate,
}: BingoEditFormProps) => {
  const { t } = useTranslation();
  const updateBoard = useBingoControllerUpdateBoard();
  const replaceTiles = useBingoControllerReplaceTiles();

  const [name, setName] = useState(data.board.name);
  const [description, setDescription] = useState(data.board.description ?? "");
  const [world, setWorld] = useState(data.board.world ?? "");
  const [mode, setMode] = useState<UpdateBingoBoardDtoMode>(data.board.mode);

  const [status, setStatus] = useState<UpdateBingoBoardDtoStatus>(
    data.board.status,
  );

  const [pointsPerTile, setPointsPerTile] = useState(data.board.pointsPerTile);

  const [pointsPerLine, setPointsPerLine] = useState(data.board.pointsPerLine);

  const [firstCompleterBonus, setFirstCompleterBonus] = useState(
    data.board.firstCompleterBonus,
  );

  const [blackoutBonus, setBlackoutBonus] = useState(data.board.blackoutBonus);

  const [draftTiles, setDraftTiles] = useState<ReplaceBingoTilesDtoTilesItem[]>(
    () => toEditableTiles(data.tiles),
  );

  const [editingCell, setEditingCell] = useState<{
    readonly row: number;
    readonly col: number;
  } | null>(null);

  const handleSaveSettings = async (event: FormEvent) => {
    event.preventDefault();

    try {
      await updateBoard.mutateAsync({
        pathParams: { guildId, boardId },
        data: {
          name: name.trim(),
          description: description.trim() || null,
          world: world.trim() || null,
          mode,
          status,
          pointsPerTile,
          pointsPerLine,
          firstCompleterBonus,
          blackoutBonus,
        },
      });
      await onInvalidate();
      toast.success(t("bingo.toasts.updated"));
    } catch {
      toast.error(t("bingo.toasts.error"));
    }
  };

  const handleSaveTiles = async () => {
    try {
      await replaceTiles.mutateAsync({
        pathParams: { guildId, boardId },
        data: { tiles: draftTiles },
      });
      await onInvalidate();
      toast.success(t("bingo.toasts.tilesSaved"));
    } catch {
      toast.error(t("bingo.toasts.error"));
    }
  };

  const handleLoadStarter = () => {
    setDraftTiles(
      buildStarterBingoTiles().map((tile) => ({
        row: tile.row,
        col: tile.col,
        title: tile.title,
        description: tile.description,
        points: null,
        condition: tile.condition,
      })),
    );
  };

  const previewTiles: BingoBoardDetailResponseDtoTilesItem[] = draftTiles.map(
    (tile) => ({
      id: `${tile.row}:${tile.col}`,
      boardId,
      row: tile.row,
      col: tile.col,
      title: tile.title,
      description: tile.description ?? null,
      points: tile.points ?? null,
      conditionKind: tile.condition.kind,
      condition: tile.condition,
      lockedByMemberId: null,
      lockedByMember: null,
      lockedAt: null,
      completedByCount: 0,
      viewerProgress: null,
    }),
  );

  const editingTile = editingCell
    ? (draftTiles.find(
        (tile) => tile.row === editingCell.row && tile.col === editingCell.col,
      ) ?? null)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <PageHeader
        icon={Settings2}
        title={t("bingo.edit")}
        description={data.board.name}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            icon={<ArrowLeft className="size-4" />}
            render={<Link to={ROUTES.guild.bingo.board(guildId, boardId)} />}
          >
            {t("bingo.backToBoard")}
          </Button>
        }
      />

      <SectionCard className="p-4">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>{t("bingo.createDialog.name")}</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("bingo.createDialog.world")}</Label>
              <Input
                value={world}
                onChange={(event) => setWorld(event.target.value)}
                placeholder={t("bingo.createDialog.worldPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("bingo.createDialog.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
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

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["DRAFT", "ACTIVE", "FINISHED"] as const).map(
                    (candidate) => (
                      <Button
                        key={candidate}
                        type="button"
                        size="sm"
                        variant={status === candidate ? "default" : "outline"}
                        onClick={() => setStatus(candidate)}
                      >
                        {t(`bingo.status.${candidate}`)}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">
                    {t("bingo.createDialog.pointsPerTile")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={pointsPerTile}
                    onChange={(event) =>
                      setPointsPerTile(
                        Math.max(0, Number(event.target.value) || 0),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    {t("bingo.createDialog.pointsPerLine")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={pointsPerLine}
                    onChange={(event) =>
                      setPointsPerLine(
                        Math.max(0, Number(event.target.value) || 0),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    {t("bingo.createDialog.firstCompleterBonus")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={firstCompleterBonus}
                    onChange={(event) =>
                      setFirstCompleterBonus(
                        Math.max(0, Number(event.target.value) || 0),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    {t("bingo.createDialog.blackoutBonus")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={blackoutBonus}
                    onChange={(event) =>
                      setBlackoutBonus(
                        Math.max(0, Number(event.target.value) || 0),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateBoard.isPending || !name.trim()}
              icon={<Save className="size-4" />}
            >
              {updateBoard.isPending
                ? t("bingo.actions.saving")
                : t("bingo.actions.saveSettings")}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("bingo.stats.configuredTiles")}: {draftTiles.length}/25
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("bingo.board.clickToConfigure")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Sparkles className="size-4" />}
              onClick={handleLoadStarter}
            >
              {t("bingo.actions.loadStarterBoard")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={replaceTiles.isPending}
              icon={<Save className="size-4" />}
              onClick={handleSaveTiles}
            >
              {replaceTiles.isPending
                ? t("bingo.actions.saving")
                : t("bingo.actions.saveBoard")}
            </Button>
          </div>
        </div>

        <BingoBoardGrid
          tiles={previewTiles}
          mode={mode}
          pointsPerTile={pointsPerTile}
          selectedMemberId={0}
          progressByTileId={new Map()}
          editable
          selectedCoord={editingCell}
          onSelectCell={(row, col) => setEditingCell({ row, col })}
        />
      </SectionCard>

      {editingCell ? (
        <BingoTileEditorDialog
          key={`${editingCell.row}:${editingCell.col}`}
          open
          row={editingCell.row}
          col={editingCell.col}
          initialTile={editingTile}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditingCell(null);
          }}
          onSave={(updatedTile) => {
            setDraftTiles((previous) => [
              ...previous.filter(
                (tile) =>
                  tile.row !== updatedTile.row || tile.col !== updatedTile.col,
              ),
              updatedTile,
            ]);
          }}
          onClear={() => {
            setDraftTiles((previous) =>
              previous.filter(
                (tile) =>
                  tile.row !== editingCell.row || tile.col !== editingCell.col,
              ),
            );
          }}
        />
      ) : null}
    </div>
  );
};
