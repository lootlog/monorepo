export const getBattleTimelinePayloadTurn = (payload: unknown) => {
  if (typeof payload !== "object" || payload === null || !("turn" in payload)) {
    return null;
  }

  const turn = Number(payload.turn);
  return Number.isNaN(turn) ? null : turn;
};
