import { useMatches, useRouterState } from "@tanstack/react-router";

export const usePresentedPathname = () =>
  useMatches({
    select: (matches) => matches[matches.length - 1]?.pathname ?? "/",
  });

const getFirstPathSegment = (pathname: string) => {
  const segment = pathname.split("/")[1];

  return segment ? decodeURIComponent(segment) : undefined;
};

export const usePendingFirstPathSegment = () =>
  useRouterState({
    select: (state) =>
      state.status === "pending"
        ? getFirstPathSegment(state.location.pathname)
        : undefined,
  });
