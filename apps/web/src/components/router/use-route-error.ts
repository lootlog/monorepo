import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { getRouteErrorStatus } from "@/lib/router/route-errors";

export function useRouteError(
  error: ErrorComponentProps["error"],
  reset: ErrorComponentProps["reset"],
) {
  const router = useRouter();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();
  const status = getRouteErrorStatus(error);
  const normalizedStatus =
    status === 401 || status === 403 || status === 404 ? status : 500;

  const handleRetry = () => {
    queryErrorResetBoundary.reset();
    reset();
    void router.invalidate();
  };

  return { normalizedStatus, handleRetry } as const;
}
