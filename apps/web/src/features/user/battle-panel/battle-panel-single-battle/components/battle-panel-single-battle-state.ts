type BattlePanelSelectedTurnParams = {
  availableTurns: number[];
  requestedTurn?: number | null;
  selectedTurn?: number | null;
};

const isAvailableTurn = (availableTurns: number[], turn: number | null) =>
  turn !== null && availableTurns.includes(turn);

export const getBattlePanelSelectedTurn = ({
  availableTurns,
  requestedTurn,
  selectedTurn,
}: BattlePanelSelectedTurnParams) => {
  const normalizedRequestedTurn = requestedTurn ?? null;
  const normalizedSelectedTurn = selectedTurn ?? null;

  if (isAvailableTurn(availableTurns, normalizedRequestedTurn)) {
    return normalizedRequestedTurn;
  }

  if (isAvailableTurn(availableTurns, normalizedSelectedTurn)) {
    return normalizedSelectedTurn;
  }

  return availableTurns[0] ?? null;
};
