import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";

export const useRouteErrorRetry = (reset: ErrorComponentProps["reset"]) => {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();

  return () => {
    queryErrorResetBoundary.reset();
    reset();
    void router.invalidate();
  };
};
