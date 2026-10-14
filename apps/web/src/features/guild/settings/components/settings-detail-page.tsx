import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { CSSProperties, ReactNode } from "react";
import { SettingsDetailBar } from "./settings-detail-bar";

type SettingsDetailPageProps = {
  /** The role, monster or member the page is about. */
  name: string;
  /** Sits before the name in the top bar, such as an avatar. */
  media?: ReactNode;
  nameStyle?: CSSProperties;
  /** `MetaItem`s and other details that open the page. */
  meta: ReactNode;
  /** Controls at the end of the details row. */
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * A role, monster or member page: the top bar names it, a row of details
 * opens the page, and banded sections follow.
 */
export const SettingsDetailPage = ({
  name,
  media,
  nameStyle,
  meta,
  actions,
  children,
}: SettingsDetailPageProps) => (
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
    <ScrollArea data-under-top-bar className="min-h-0 flex-1">
      <SettingsDetailBar meta={meta} actions={actions} />
      {children}
    </ScrollArea>
  </div>
);
