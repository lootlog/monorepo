import { stringify } from "qs";

type QueryParamValue = number | string | null | undefined;

export const stringifyQueryParams = (
  queryParams: Record<string, QueryParamValue>,
) =>
  stringify(queryParams, {
    filter: (_, value) => {
      if (value === "" || value == null) {
        return;
      }

      return value;
    },
  });
