import {
  bingoCoordKey,
  bingoGridCoords,
  findBingoCompletedLineCoordKeys,
  indexBingoTilesByCoord,
} from "@lootlog/domain/bingo";
import type {
  BingoBoardDetailResponseDtoMemberProgressItem,
  BingoBoardDetailResponseDtoTilesItem,
  BingoBoardSummaryResponseDtoMode,
} from "@lootlog/client/main";
import { cn } from "cn";
import { BingoBoardCell } from "./bingo-board-cell";

const LARGE_SCREEN_COLUMN_CLASS = new Map<number, string>([
  [3, "lg:grid-cols-3"],
  [4, "lg:grid-cols-4"],
  [5, "lg:grid-cols-5"],
  [6, "lg:grid-cols-6"],
  [7, "lg:grid-cols-7"],
]);

type BingoBoardGridProps = {
  readonly tiles: ReadonlyArray<BingoBoardDetailResponseDtoTilesItem>;
  readonly mode: BingoBoardSummaryResponseDtoMode;
  readonly size: number;
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

export const BingoBoardGrid = ({
  tiles,
  mode,
  size,
  pointsPerTile,
  selectedMemberId,
  progressByTileId,
  editable = false,
  selectedCoord = null,
  onSelectCell,
}: BingoBoardGridProps) => {
  const tileByCoord = indexBingoTilesByCoord(tiles);

  const coordsInCompletedLine = findBingoCompletedLineCoordKeys(
    { mode, size },
    selectedMemberId,
    tiles,
    (tile) => (progressByTileId.get(tile.id)?.completedAt ?? null) !== null,
  );

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-2",
        LARGE_SCREEN_COLUMN_CLASS.get(size),
      )}
    >
      {bingoGridCoords(size).map((coord) => {
        const { row, col } = coord;
        const key = bingoCoordKey(coord);
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
