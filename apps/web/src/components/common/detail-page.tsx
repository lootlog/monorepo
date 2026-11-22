import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { TopBarTitle } from "@/components/layout/top-bar-title";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { CSSProperties, ReactNode, Ref } from "react";
import { DetailBar } from "./detail-bar";

type DetailPageProps = {
  name: string;
  media?: ReactNode;
  nameStyle?: CSSProperties;
  meta: ReactNode;
  actions?: ReactNode;
  scrollRef?: Ref<HTMLDivElement>;
  children: ReactNode;
};

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
    <HeaderSlotPortal slot="title">
      <TopBarTitle media={media} style={nameStyle}>
        {name}
      </TopBarTitle>
    </HeaderSlotPortal>
    <ScrollArea data-under-top-bar ref={scrollRef} className="min-h-0 flex-1">
      <DetailBar meta={meta} actions={actions} />
      {children}
    </ScrollArea>
  </div>
);
