import type { GuildMember } from "@/features/guild/settings/members/members.types";
import {
  getVirtualListPadding,
  usePageVirtualizer,
} from "@/hooks/utils/use-page-scroll";
import { useRef, useState } from "react";
import { MemberDeactivationDialog } from "./components/member-deactivation-dialog";
import {
  getMemberDisplayData,
  type MemberActivitySources,
} from "./member-display-data";
import { MemberTile } from "./member-tile";

type MembersListProps = MemberActivitySources & {
  members: GuildMember[];
  guildOwnerId: string | undefined;
  /** The page's scroll viewport. */
  scrollElement: HTMLDivElement | null;
  canManageMembers: boolean;
  guildId: string;
};

/** A member tile's height: a 20px name line and a 15px meta line, padded. */
const TILE_ESTIMATE = 64;

/** The member tiles, rendered as they scroll into view. */
export const MembersList = ({
  members,
  guildOwnerId,
  scrollElement,
  canManageMembers,
  guildId,
  ...activitySources
}: MembersListProps) => {
  "use no memo"; // Reads a virtualizer that mutates in place; see usePageVirtualizer.

  const listRef = useRef<HTMLDivElement>(null);

  const [deactivationTarget, setDeactivationTarget] = useState<{
    guildId: string;
    member: GuildMember;
  } | null>(null);

  const virtualizer = usePageVirtualizer<HTMLDivElement>({
    count: members.length,
    scrollElement,
    listRef,
    getItemKey: (index) => members[index]?.id ?? `member-${index}`,
    estimateSize: () => TILE_ESTIMATE,
    overscan: 8,
  });

  const virtualRows = virtualizer.getVirtualItems();

  const { top: topPadding, bottom: bottomPadding } = getVirtualListPadding(
    virtualRows,
    virtualizer.getTotalSize(),
    virtualizer.options.scrollMargin,
  );

  return (
    <>
      {/* Takes focus back when the member a dialog was for has left the list. */}
      <div ref={listRef} tabIndex={-1} className="outline-none">
        {topPadding > 0 && (
          <div aria-hidden="true" style={{ height: topPadding }} />
        )}
        {virtualRows.map((virtualRow) => {
          const member = members[virtualRow.index];

          if (!member) return null;

          return (
            <MemberTile
              key={virtualRow.key}
              ref={virtualizer.measureElement}
              index={virtualRow.index}
              guildId={guildId}
              member={member}
              displayData={getMemberDisplayData(member, activitySources)}
              isOwner={member.userId === guildOwnerId}
              canManageMembers={canManageMembers}
              onDeactivate={() => setDeactivationTarget({ guildId, member })}
            />
          );
        })}
        {bottomPadding > 0 && (
          <div aria-hidden="true" style={{ height: bottomPadding }} />
        )}
      </div>
      {canManageMembers && deactivationTarget && (
        <MemberDeactivationDialog
          guildId={deactivationTarget.guildId}
          member={deactivationTarget.member}
          onClose={() => setDeactivationTarget(null)}
          finalFocus={() =>
            listRef.current?.querySelector<HTMLElement>(
              `[data-member-id="${deactivationTarget.member.id}"] [data-member-actions]`,
            ) ?? listRef.current
          }
        />
      )}
    </>
  );
};
