import { useLayoutEffect, useRef, type FC } from "react";

type CountBadgeProps = {
  count: number;
};

/**
 * Repeated reports of one NPC collapse into a single chat row or notification;
 * the badge shows how many there were and bumps when another arrives. Outside
 * the chat its density variables are unset, so the fallbacks match the
 * readable chat preset.
 */
export const CountBadge: FC<CountBadgeProps> = ({ count }) => {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const previousCountRef = useRef(count);

  useLayoutEffect(() => {
    if (count > previousCountRef.current) {
      badgeRef.current?.classList.add("ll-count-bump");
    }

    previousCountRef.current = count;
  }, [count]);

  if (count <= 1) {
    return null;
  }

  return (
    <span
      ref={badgeRef}
      className="ll:inline-flex ll:shrink-0 ll:rounded-full ll:bg-red-600 ll:px-[var(--ll-chat-space-md,6px)] ll:py-px ll:text-[length:var(--ll-chat-detail-font-size,10px)] ll:font-bold ll:leading-none ll:text-white"
      key={count}
    >
      x{count}
    </span>
  );
};
