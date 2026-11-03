import { cn } from "cn";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

const supportsHiddenUntilFound =
  typeof HTMLElement !== "undefined" &&
  "onbeforematch" in HTMLElement.prototype;

type GuildDocItemFindableIdProps = {
  itemId: string;
};

/**
 * An item's in-game identifier that the browser's find-in-page reaches while
 * the chip shows only the item. A match reveals it under the item until another
 * identifier is found. Browsers without `hidden="until-found"` still match it,
 * without a visible highlight.
 */
export const GuildDocItemFindableId = ({
  itemId,
}: GuildDocItemFindableIdProps) => {
  const ref = useRef<HTMLElement>(null);
  const [found, setFound] = useState(false);

  // React 19 cannot render `hidden="until-found"`, so it is set before paint.
  useLayoutEffect(() => {
    const element = ref.current;

    if (!supportsHiddenUntilFound || found || !element) {
      return;
    }

    element.setAttribute("hidden", "until-found");

    // The browser highlights the match right after this event, in this same
    // text node, so it must leave the out-of-flow position synchronously.
    const reveal = () => flushSync(() => setFound(true));

    element.addEventListener("beforematch", reveal);

    return () => element.removeEventListener("beforematch", reveal);
  }, [found]);

  useEffect(() => {
    if (!found) {
      return;
    }

    const hideOnOtherMatch = (event: Event) => {
      if (event.target !== ref.current) {
        setFound(false);
      }
    };

    document.addEventListener("beforematch", hideOnOtherMatch);

    return () => document.removeEventListener("beforematch", hideOnOtherMatch);
  }, [found]);

  return (
    <code
      ref={ref}
      aria-hidden={supportsHiddenUntilFound ? undefined : true}
      className={cn(
        "font-mono text-xs",
        found
          ? "basis-full break-all text-muted-foreground"
          : supportsHiddenUntilFound
            ? "absolute"
            : "sr-only",
      )}
    >
      {itemId}
    </code>
  );
};
