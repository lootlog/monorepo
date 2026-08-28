import { useLayoutEffect, useRef, type FC } from "react";

type ChatNpcCountBadgeProps = {
  count: number;
};

export const ChatNpcCountBadge: FC<ChatNpcCountBadgeProps> = ({ count }) => {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const previousCountRef = useRef(count);

  useLayoutEffect(() => {
    if (count > previousCountRef.current) {
      badgeRef.current?.classList.add("ll-chat-npc-count-bump");
    }
    previousCountRef.current = count;
  }, [count]);

  if (count <= 1) {
    return null;
  }

  return (
    <span
      ref={badgeRef}
      className="ll:inline-flex ll:shrink-0 ll:rounded-full ll:bg-red-600 ll:px-[var(--ll-chat-space-md)] ll:py-px ll:text-[length:var(--ll-chat-detail-font-size)] ll:font-bold ll:leading-none ll:text-white"
      key={count}
    >
      x{count}
    </span>
  );
};
