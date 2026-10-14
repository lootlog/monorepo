import { NotificationRuleRowSkeleton } from "./notification-rule-row-skeleton";

/** Stands in for the channel list. */
export const NotificationChannelRowsSkeleton = () => (
  <div aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => (
      <NotificationRuleRowSkeleton key={index} />
    ))}
  </div>
);
