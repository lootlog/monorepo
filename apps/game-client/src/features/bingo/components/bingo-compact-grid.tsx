import {
  BINGO_GRID_COORDS,
  bingoCoordKey,
  findBingoCompletedLineCoordKeys,
  indexBingoTilesByCoord,
} from "@lootlog/domain/bingo";
import type { BingoBoardDetailResponseDto } from "@lootlog/client/main";
import { BingoCompactCell } from "./bingo-compact-cell";

type BingoCompactGridProps = {
  readonly detail: BingoBoardDetailResponseDto;
};

export const BingoCompactGrid = ({ detail }: BingoCompactGridProps) => {
  const tileByCoord = indexBingoTilesByCoord(detail.tiles);

  const coordsInCompletedLine = findBingoCompletedLineCoordKeys(
    detail.board.mode,
    detail.viewerMemberId,
    detail.tiles,
    (tile) => (tile.viewerProgress?.completedAt ?? null) !== null,
  );

  return (
    <div className="ll:grid ll:grid-cols-5 ll:gap-1">
      {BINGO_GRID_COORDS.map((coord) => {
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
