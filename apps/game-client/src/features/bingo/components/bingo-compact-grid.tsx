import { BINGO_LINES, computeCompletedBingoLines } from "@lootlog/domain/bingo";
import type {
  BingoBoardDetailResponseDto,
  BingoBoardDetailResponseDtoTilesItem,
} from "@lootlog/client/main";
import { BingoCompactCell } from "./bingo-compact-cell";

type BingoCompactGridProps = {
  readonly detail: BingoBoardDetailResponseDto;
};

const CELLS = Array.from({ length: 25 }, (_, index) => ({
  row: Math.floor(index / 5),
  col: index % 5,
}));

export const BingoCompactGrid = ({ detail }: BingoCompactGridProps) => {
  const tileByCoord = new Map<string, BingoBoardDetailResponseDtoTilesItem>(
    detail.tiles.map((tile) => [`${tile.row}:${tile.col}`, tile]),
  );

  const completedCoords = detail.tiles.flatMap((tile) => {
    const progress = tile.viewerProgress;

    if (!progress || progress.completedAt === null) return [];

    if (
      detail.board.mode === "LOCKOUT" &&
      tile.lockedByMemberId !== null &&
      tile.lockedByMemberId !== detail.viewerMemberId
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
    <div className="ll:grid ll:grid-cols-5 ll:gap-1">
      {CELLS.map(({ row, col }) => {
        const key = `${row}:${col}`;

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
