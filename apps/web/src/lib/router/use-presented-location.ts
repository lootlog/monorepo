import { useMatches, useRouterState } from "@tanstack/react-router";

/**
 * The path of the page on screen, from the matches the router renders.
 * `useLocation` moves to a navigation's target as soon as it starts, while
 * the previous page (or the target's skeleton) is still what shows; chrome
 * drawn around the page reads this instead, so it never pairs one page with
 * another's address.
 */
export const usePresentedPathname = () =>
  useMatches({
    select: (matches) => matches[matches.length - 1]?.pathname ?? "/",
  });

const getFirstPathSegment = (pathname: string) => {
  const segment = pathname.split("/")[1];

  return segment ? decodeURIComponent(segment) : undefined;
};

/**
 * The first path segment of a navigation that is still loading, which names
 * the Organization being opened; `undefined` when nothing is loading. The
 * server rail marks it at once, so a click answers before the page arrives.
 */
export const usePendingFirstPathSegment = () =>
  useRouterState({
    select: (state) =>
      state.status === "pending"
        ? getFirstPathSegment(state.location.pathname)
        : undefined,
  });
