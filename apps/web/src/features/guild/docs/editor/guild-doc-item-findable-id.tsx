import { cn } from "cn";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

const supportsHiddenUntilFound =
  typeof HTMLElement !== "undefined" &&
  "onbeforematch" in HTMLElement.prototype;

type GuildDocItemFindableIdProps = {
  itemId: string;
};

export const GuildDocItemFindableId = ({
  itemId,
}: GuildDocItemFindableIdProps) => {
  const ref = useRef<HTMLElement>(null);
  const [found, setFound] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!supportsHiddenUntilFound || found || !element) {
      return;
    }

    element.setAttribute("hidden", "until-found");

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
