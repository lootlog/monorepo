/** Pages through a list the client already holds in full. */
export const getOffsetPagination = (
  pageIndex: number,
  total: number,
  pageSize: number,
  setPageIndex: (pageIndex: number) => void,
) => {
  const cursor = pageIndex * pageSize;
  const hasNext = cursor + pageSize < total;
  const hasPrev = pageIndex > 0;

  return {
    cursor,
    hasNext,
    hasPrev,
    handleNextPage: () => {
      if (hasNext) setPageIndex(pageIndex + 1);
    },
    handlePreviousPage: () => {
      if (hasPrev) setPageIndex(pageIndex - 1);
    },
  };
};
