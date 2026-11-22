import { NotificationRuleRowSkeleton } from "./notification-rule-row-skeleton";

export const NotificationChannelRowsSkeleton = () => (
  <div aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => (
      <NotificationRuleRowSkeleton key={index} />
    ))}
  </div>
);
