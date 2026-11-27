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
import { UnsavedChangesBar } from "@/components/ui/unsaved-changes-bar";
import { BandSection } from "@lootlog/ui/components/band-section";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { OptionCardGroup } from "@lootlog/ui/components/option-card-group";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Textarea } from "@lootlog/ui/components/textarea";
import { LIST_TILE_INSET_CLASS } from "@lootlog/ui/lib/list-tile";
import { toast } from "@lootlog/ui/lib/toast";
import { cn } from "cn";
import { isEqual, sortBy } from "es-toolkit";
import { Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { BingoBoardGrid } from "./bingo-board-grid";
import { BingoBoardSizeField } from "./bingo-board-size-field";
import { BingoTileEditorDialog } from "./bingo-tile-editor-dialog";

const BINGO_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "FINISHED",
] as const satisfies readonly UpdateBingoBoardDtoStatus[];

const POINT_FIELDS = [
  "pointsPerTile",
  "pointsPerLine",
  "firstCompleterBonus",
  "blackoutBonus",
] as const;

type BingoSettingsFormValues = {
  name: string;
  description: string;
  world: string;
  mode: UpdateBingoBoardDtoMode;
  size: number;
  status: UpdateBingoBoardDtoStatus;
  pointsPerTile: number;
  pointsPerLine: number;
  firstCompleterBonus: number;
  blackoutBonus: number;
};

const toSettingsDefaults = ({
  board,
}: BingoBoardDetailResponseDto): BingoSettingsFormValues => ({
  name: board.name,
  description: board.description ?? "",
  world: board.world ?? "",
  mode: board.mode,
  size: board.size,
  status: board.status,
  pointsPerTile: board.pointsPerTile,
  pointsPerLine: board.pointsPerLine,
  firstCompleterBonus: board.firstCompleterBonus,
  blackoutBonus: board.blackoutBonus,
});

const toPoints = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

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

const sortByCoord = (tiles: ReadonlyArray<ReplaceBingoTilesDtoTilesItem>) =>
  sortBy(tiles, ["row", "col"]);

const isInsideBoard =
  (size: number) => (tile: { readonly row: number; readonly col: number }) =>
    tile.row < size && tile.col < size;

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
  const fieldId = useId();
  const updateBoard = useBingoControllerUpdateBoard();
  const replaceTiles = useBingoControllerReplaceTiles();

  const savedSettings = toSettingsDefaults(data);

  const form = useForm<BingoSettingsFormValues>({
    values: savedSettings,
    resetOptions: { keepFieldsRef: true },
  });

  const [mode, size, pointsPerTile] = useWatch({
    control: form.control,
    name: ["mode", "size", "pointsPerTile"],
  });

  const savedTiles = toEditableTiles(data.tiles);
  const [draftTiles, setDraftTiles] = useState(savedTiles);

  const [editingCell, setEditingCell] = useState<{
    readonly row: number;
    readonly col: number;
  } | null>(null);

  const structureLocked =
    data.memberProgress.length > 0 || data.leaderboard.length > 0;

  const visibleTiles = draftTiles.filter(isInsideBoard(size));
  const removedTileCount = draftTiles.length - visibleTiles.length;

  const tilesDirty = !isEqual(sortByCoord(draftTiles), sortByCoord(savedTiles));

  const isDirty = form.formState.isDirty || tilesDirty;

  const sizeHint = structureLocked
    ? t("bingo.boardSize.locked")
    : removedTileCount > 0
      ? t("bingo.boardSize.shrinkWarning", { count: removedTileCount, size })
      : null;

  const onSubmit = async (values: BingoSettingsFormValues) => {
    try {
      if (form.formState.isDirty) {
        await updateBoard.mutateAsync({
          pathParams: { guildId, boardId },
          data: {
            name: values.name.trim(),
            description: values.description.trim() || null,
            world: values.world.trim() || null,
            mode: values.mode,
            size: values.size,
            status: values.status,
            pointsPerTile: toPoints(values.pointsPerTile),
            pointsPerLine: toPoints(values.pointsPerLine),
            firstCompleterBonus: toPoints(values.firstCompleterBonus),
            blackoutBonus: toPoints(values.blackoutBonus),
          },
        });
      }

      if (tilesDirty) {
        await replaceTiles.mutateAsync({
          pathParams: { guildId, boardId },
          data: { tiles: visibleTiles },
        });
      }

      await onInvalidate();
      toast.success(t("bingo.toasts.updated"));
    } catch {
      toast.error(t("bingo.toasts.error"));
    }
  };

  const handleLoadStarter = () => {
    setDraftTiles(
      buildStarterBingoTiles(size).map((tile) => ({
        row: tile.row,
        col: tile.col,
        title: tile.title,
        description: tile.description,
        points: null,
        condition: tile.condition,
      })),
    );
  };

  const previewTiles: BingoBoardDetailResponseDtoTilesItem[] = visibleTiles.map(
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
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <h1 className="sr-only">
          {t("bingo.editNamed", { name: data.board.name })}
        </h1>

        <form className="pb-24" onSubmit={form.handleSubmit(onSubmit)}>
          <BandSection
            id="bingo-settings-general"
            title={t("bingo.editSections.general")}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-name`}>
                  {t("bingo.createDialog.name")}
                </Label>
                <Input
                  id={`${fieldId}-name`}
                  {...form.register("name", {
                    required: true,
                    validate: (value) => value.trim().length > 0,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-world`}>
                  {t("bingo.createDialog.world")}
                </Label>
                <Input
                  id={`${fieldId}-world`}
                  placeholder={t("bingo.createDialog.worldPlaceholder")}
                  {...form.register("world")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-description`}>
                {t("bingo.createDialog.descriptionLabel")}
              </Label>
              <Textarea
                id={`${fieldId}-description`}
                rows={2}
                {...form.register("description")}
              />
            </div>
          </BandSection>

          <BandSection
            id="bingo-settings-rules"
            title={t("bingo.editSections.rules")}
          >
            <div className="space-y-2">
              <Label id={`${fieldId}-mode`}>
                {t("bingo.createDialog.mode")}
              </Label>
              <Controller
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <OptionCardGroup
                    aria-labelledby={`${fieldId}-mode`}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={structureLocked}
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
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="size"
              render={({ field }) => (
                <BingoBoardSizeField
                  value={field.value}
                  onChange={field.onChange}
                  disabled={structureLocked}
                  hint={sizeHint}
                />
              )}
            />

            <div className="space-y-2">
              <Label id={`${fieldId}-status`}>
                {t("bingo.createDialog.status")}
              </Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <div
                    role="group"
                    aria-labelledby={`${fieldId}-status`}
                    className="flex flex-wrap gap-1.5"
                  >
                    {BINGO_STATUSES.map((candidate) => (
                      <Button
                        key={candidate}
                        type="button"
                        size="sm"
                        variant={
                          field.value === candidate ? "default" : "outline"
                        }
                        aria-pressed={field.value === candidate}
                        onClick={() => field.onChange(candidate)}
                      >
                        {t(`bingo.status.${candidate}`)}
                      </Button>
                    ))}
                  </div>
                )}
              />
            </div>
          </BandSection>

          <BandSection
            id="bingo-settings-scoring"
            title={t("bingo.editSections.scoring")}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {POINT_FIELDS.map((name) => (
                <div key={name} className="space-y-2">
                  <Label htmlFor={`${fieldId}-${name}`}>
                    {t(`bingo.createDialog.${name}`)}
                  </Label>
                  <Input
                    id={`${fieldId}-${name}`}
                    type="number"
                    min={0}
                    {...form.register(name, { valueAsNumber: true })}
                  />
                </div>
              ))}
            </div>
          </BandSection>

          <BandSection
            id="bingo-settings-tiles"
            title={t("bingo.editSections.tiles")}
            description={t("bingo.board.clickToConfigure")}
            count={t("bingo.units.tileFraction", {
              done: visibleTiles.length,
              total: size * size,
            })}
            trailing={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Sparkles className="size-4" />}
                onClick={handleLoadStarter}
              >
                {t("bingo.actions.loadStarterBoard")}
              </Button>
            }
            tiled
          >
            <div className={cn("py-4", LIST_TILE_INSET_CLASS)}>
              <BingoBoardGrid
                tiles={previewTiles}
                mode={mode}
                size={size}
                pointsPerTile={toPoints(pointsPerTile)}
                selectedMemberId={0}
                progressByTileId={new Map()}
                editable
                selectedCoord={editingCell}
                onSelectCell={(row, col) => setEditingCell({ row, col })}
              />
            </div>
          </BandSection>

          <UnsavedChangesBar
            isDirty={isDirty}
            isSubmitting={form.formState.isSubmitting}
            onReset={() => {
              form.reset(savedSettings);
              setDraftTiles(savedTiles);
            }}
          />
        </form>
      </ScrollArea>

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
