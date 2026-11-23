import type { UserAction } from "@/lib/user-action";
import { noticeText } from "@/lib/messages";
import { usePageAction } from "@/lib/use-page-action";
import { performUserAction } from "@/server/queries";

export function useUserAction(userId: string) {
  return usePageAction<UserAction>(
    (action) => performUserAction({ data: { userId, action } }),
    { done: (action) => noticeText[action] },
  );
}
