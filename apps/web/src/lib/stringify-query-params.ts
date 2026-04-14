import { stringify } from "qs";

type QueryParamValue = number | string | null | undefined;

export const filterEmptyValues = (_: string, value: unknown) => {
  if (value === "" || value === undefined || value === null) {
    return;
  }

  return value;
};

export const stringifyQueryParams = (
  queryParams: Record<string, QueryParamValue>,
) =>
  stringify(queryParams, {
    filter: filterEmptyValues,
  });
