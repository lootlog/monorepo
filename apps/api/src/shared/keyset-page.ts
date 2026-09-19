/** Keyset pagination over a `limit + 1` fetch. */
export const takeKeysetPage = <Row>(rows: Row[], limit: number) => {
  const hasMore = rows.length > limit;

  return { rows: hasMore ? rows.slice(0, limit) : rows, hasMore };
};

export const keysetNextCursor = <Row extends { readonly id: string }>(
  rows: readonly Row[],
  hasMore: boolean,
) => (hasMore ? rows[rows.length - 1]?.id : null);
