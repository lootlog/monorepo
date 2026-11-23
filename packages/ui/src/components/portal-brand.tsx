import { useRender } from "@base-ui/react/use-render";
import type { ReactElement } from "react";
import { LootlogMark } from "./lootlog-mark";

export function PortalBrand({
  home,
  title,
  section,
}: {
  home: ReactElement;
  title: string;
  section: string;
}) {
  return useRender({
    render: home,
    props: {
      "aria-label": title,
      className:
        "inline-flex shrink-0 items-center gap-2.5 rounded-md py-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
      children: (
        <>
          <LootlogMark className="size-7 shrink-0" />
          <span className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
            Lootlog
          </span>
          <span className="hidden text-[0.9375rem] font-medium text-muted-foreground sm:inline">
            {section}
          </span>
        </>
      ),
    },
  });
}
