import { PageSkeleton } from "@/components/common/page-skeleton";
import { useMatches, useRouter } from "@tanstack/react-router";

export const EventRoutePending = () => {
  const router = useRouter();

  const deepestRouteId = useMatches({
    select: (matches) => matches[matches.length - 1]?.routeId,
  });

  const Pending = deepestRouteId
    ? router.routesById[deepestRouteId].options.pendingComponent
    : undefined;

  if (!Pending || Pending === EventRoutePending) return <PageSkeleton />;

  return <Pending />;
};
