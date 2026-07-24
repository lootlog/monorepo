import { useEffect, useRef, type FC } from "react";
import { cn } from "@/lib/utils";

type ChatNpcCountBadgeProps = {
  count: number;
};

export const ChatNpcCountBadge: FC<ChatNpcCountBadgeProps> = ({ count }) => {
  const previousCountRef = useRef(count);
  const shouldAnimateIncrement = count > previousCountRef.current;

  useEffect(() => {
    previousCountRef.current = count;
  }, [count]);

  if (count <= 1) {
    return null;
  }

  return (
    <span
      className={cn(
        "ll:inline-flex ll:shrink-0 ll:rounded-full ll:bg-red-600 ll:px-[var(--ll-chat-space-md)] ll:py-px ll:text-[length:var(--ll-chat-detail-font-size)] ll:font-bold ll:leading-none ll:text-white",
        shouldAnimateIncrement && "ll-chat-npc-count-bump",
      )}
      key={count}
    >
      x{count}
    </span>
  );
};
