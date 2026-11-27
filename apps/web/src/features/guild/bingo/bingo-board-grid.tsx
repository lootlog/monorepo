import { BINGO_LINES, computeCompletedBingoLines } from "@lootlog/domain/bingo";
import type {
  BingoBoardDetailResponseDtoMemberProgressItem,
  BingoBoardDetailResponseDtoTilesItem,
  BingoBoardSummaryResponseDtoMode,
} from "@lootlog/client/main";
import { BingoBoardCell } from "./bingo-board-cell";

type BingoBoardGridProps = {
  readonly tiles: ReadonlyArray<BingoBoardDetailResponseDtoTilesItem>;
  readonly mode: BingoBoardSummaryResponseDtoMode;
  readonly pointsPerTile: number;
  readonly selectedMemberId: number;
  readonly progressByTileId: ReadonlyMap<
    string,
    BingoBoardDetailResponseDtoMemberProgressItem
  >;
  readonly editable?: boolean;
  readonly selectedCoord?: {
    readonly row: number;
    readonly col: number;
  } | null;
  readonly onSelectCell?: (
    row: number,
    col: number,
    tile: BingoBoardDetailResponseDtoTilesItem | null,
  ) => void;
};

const COORDS = Array.from({ length: 25 }, (_, index) => ({
  row: Math.floor(index / 5),
  col: index % 5,
}));

export const BingoBoardGrid = ({
  tiles,
  mode,
  pointsPerTile,
  selectedMemberId,
  progressByTileId,
  editable = false,
  selectedCoord = null,
  onSelectCell,
}: BingoBoardGridProps) => {
  const tileByCoord = new Map(
    tiles.map((tile) => [`${tile.row}:${tile.col}`, tile]),
  );

  const completedCoords = tiles.flatMap((tile) => {
    const progress = progressByTileId.get(tile.id);

    if (!progress || progress.completedAt === null) return [];

    if (
      mode === "LOCKOUT" &&
      tile.lockedByMemberId !== null &&
      tile.lockedByMemberId !== selectedMemberId
    ) {
      return [];
    }

    return [{ row: tile.row, col: tile.col }];
  });

  const completedLineIds = new Set(computeCompletedBingoLines(completedCoords));

  const coordsInCompletedLine = new Set(
    BINGO_LINES.flatMap((line) =>
      completedLineIds.has(line.id)
        ? line.coords.map(({ row, col }) => `${row}:${col}`)
        : [],
    ),
  );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {COORDS.map(({ row, col }) => {
        const key = `${row}:${col}`;
        const tile = tileByCoord.get(key) ?? null;

        return (
          <BingoBoardCell
            key={key}
            row={row}
            col={col}
            tile={tile}
            mode={mode}
            pointsPerTile={pointsPerTile}
            selectedMemberId={selectedMemberId}
            progress={tile ? (progressByTileId.get(tile.id) ?? null) : null}
            editable={editable}
            isSelected={
              selectedCoord?.row === row && selectedCoord?.col === col
            }
            isInCompletedLine={coordsInCompletedLine.has(key)}
            onSelectCell={onSelectCell}
          />
        );
      })}
    </div>
  );
};
