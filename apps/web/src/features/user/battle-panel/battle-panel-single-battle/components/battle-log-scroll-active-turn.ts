export type BattleLogTurnPosition = {
  turn: number;
  top: number;
  bottom: number;
};

export type GetBattleLogScrollActiveTurnInput = {
  turnPositions: BattleLogTurnPosition[];
  viewportTop: number;
  viewportBottom: number;
  occlusionBottom?: number | null;
};

const ACTIVE_TURN_ANCHOR_OFFSET = 12;

export const getBattleLogScrollActiveTurn = ({
  turnPositions,
  viewportTop,
  viewportBottom,
  occlusionBottom,
}: GetBattleLogScrollActiveTurnInput) => {
  if (turnPositions.length === 0) {
    return null;
  }

  const visibleTop =
    Math.max(viewportTop, occlusionBottom ?? viewportTop) +
    ACTIVE_TURN_ANCHOR_OFFSET;
  const visibleRows = turnPositions.filter(
    (position) =>
      position.bottom >= visibleTop && position.top <= viewportBottom,
  );

  if (visibleRows.length === 0) {
    return null;
  }

  const containingAnchor = visibleRows.find(
    (position) => position.top <= visibleTop && position.bottom >= visibleTop,
  );

  if (containingAnchor) {
    return containingAnchor.turn;
  }

  return visibleRows.reduce((closestPosition, position) => {
    const closestDistance = Math.abs(closestPosition.top - visibleTop);
    const positionDistance = Math.abs(position.top - visibleTop);

    if (positionDistance < closestDistance) {
      return position;
    }

    return closestPosition;
  }).turn;
};
