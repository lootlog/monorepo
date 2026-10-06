import {
  useMessageScroller,
  useMessageScrollerScrollable,
} from "@shadcn/react/message-scroller";
import { ArrowDown } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";

type ScrollToLatestButtonProps = {
  label: string;
};

/** Floats over a message transcript while newer messages are below the viewport. */
export const ScrollToLatestButton: FC<ScrollToLatestButtonProps> = ({
  label,
}) => {
  const { scrollToEnd } = useMessageScroller();
  const { end } = useMessageScrollerScrollable();

  return (
    <Button
      variant="secondary"
      size="xs"
      hidden={!end}
      style={{ display: end ? undefined : "none" }}
      onClick={() => scrollToEnd({ behavior: "instant" })}
      aria-label={label}
      className="ll:absolute ll:bottom-2 ll:left-1/2 ll:-translate-x-1/2 ll:size-7 ll:p-0 ll:shadow-md ll:bg-gray-800/90 ll:hover:bg-gray-700/95"
    >
      <ArrowDown aria-hidden className="ll:size-3" />
    </Button>
  );
};
