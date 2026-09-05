export const getOffsetPagination = (
  cursor: number,
  total: number,
  pageSize: number,
  setCursor: (cursor: number) => void,
) => {
  const hasNext = cursor + pageSize < total;
  const hasPrev = cursor > 0;
  return {
    hasNext,
    hasPrev,
    handleNextPage: () => {
      if (hasNext) setCursor(cursor + pageSize);
    },
    handlePreviousPage: () => {
      if (hasPrev) setCursor(Math.max(0, cursor - pageSize));
    },
  };
};
