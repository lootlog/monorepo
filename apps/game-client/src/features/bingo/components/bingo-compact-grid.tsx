import {
  bingoCoordKey,
  bingoGridCoords,
  findBingoCompletedLineCoordKeys,
  indexBingoTilesByCoord,
} from "@lootlog/domain/bingo";
import type { BingoBoardDetailResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
import { BingoCompactCell } from "./bingo-compact-cell";

const GRID_COLUMN_CLASS = new Map<number, string>([
  [3, "ll:grid-cols-3"],
  [4, "ll:grid-cols-4"],
  [5, "ll:grid-cols-5"],
  [6, "ll:grid-cols-6"],
  [7, "ll:grid-cols-7"],
]);

type BingoCompactGridProps = {
  readonly detail: BingoBoardDetailResponseDto;
};

export const BingoCompactGrid = ({ detail }: BingoCompactGridProps) => {
  const tileByCoord = indexBingoTilesByCoord(detail.tiles);

  const coordsInCompletedLine = findBingoCompletedLineCoordKeys(
    detail.board,
    detail.viewerMemberId,
    detail.tiles,
    (tile) => (tile.viewerProgress?.completedAt ?? null) !== null,
  );

  return (
    <div
      className={cn(
        "ll:grid ll:gap-1",
        GRID_COLUMN_CLASS.get(detail.board.size),
      )}
    >
      {bingoGridCoords(detail.board.size).map((coord) => {
        const key = bingoCoordKey(coord);

        return (
          <BingoCompactCell
            key={key}
            tile={tileByCoord.get(key) ?? null}
            mode={detail.board.mode}
            viewerMemberId={detail.viewerMemberId}
            inCompletedLine={coordsInCompletedLine.has(key)}
          />
        );
      })}
    </div>
  );
};
