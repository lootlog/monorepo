import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { CSSProperties, ReactNode, Ref } from "react";
import { DetailBar } from "./detail-bar";

type DetailPageProps = {
  /** The subject of the page, such as a role, monster or member. */
  name: string;
  /** Sits before the name in the top bar, such as an avatar. */
  media?: ReactNode;
  nameStyle?: CSSProperties;
  /** `MetaItem`s and other details that open the page. */
  meta: ReactNode;
  /** Controls at the end of the details row. */
  actions?: ReactNode;
  /** The page's scroll viewport, for content that loads more as it scrolls. */
  scrollRef?: Ref<HTMLDivElement>;
  children: ReactNode;
};

/**
 * A page about one subject, such as a role, monster or member: the top bar
 * names it, a row of details opens the page, and its content follows.
 */
export const DetailPage = ({
  name,
  media,
  nameStyle,
  meta,
  actions,
  scrollRef,
  children,
}: DetailPageProps) => (
  <div className="flex h-full min-h-0 flex-col">
    <h1 className="sr-only">{name}</h1>
    {/* The top bar shows the page's name, so it reads like a document title. */}
    <HeaderSlotPortal slot="title">
      <span
        aria-current="page"
        className="flex h-8 min-w-0 items-center gap-2 px-2 text-sm font-semibold"
      >
        {media}
        <span className="truncate" style={nameStyle}>
          {name}
        </span>
      </span>
    </HeaderSlotPortal>
    <ScrollArea data-under-top-bar ref={scrollRef} className="min-h-0 flex-1">
      <DetailBar meta={meta} actions={actions} />
      {children}
    </ScrollArea>
  </div>
);
