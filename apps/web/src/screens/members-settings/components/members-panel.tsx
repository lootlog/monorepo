import { ScrollArea } from "@/components/ui/scroll-area";
import { GuildMember } from "@/hooks/api/use-guild-member";
import { MemberData } from "@/screens/members-settings/components/member-data";
import { MemberSyncButton } from "@/screens/members-settings/components/member-sync-button";
import { ArrowLeft } from "lucide-react";
import { FC } from "react";

export type MembersPanelContentProps = {
  selectedMember: GuildMember;
  setSelectedMember: (member: GuildMember | null) => void;
  selectedMemberColor: string | undefined;
  isOwner?: boolean;
};

export const MembersPanelContent: FC<MembersPanelContentProps> = ({
  selectedMember,
  setSelectedMember,
  selectedMemberColor,
  isOwner = false,
}) => (
  <>
    <div className="p-4 border-b h-12 flex flex-row gap-4 items-center justify-between">
      <div className="flex items-center gap-4">
        <ArrowLeft
          className="cursor-pointer"
          onClick={() => setSelectedMember(null)}
        />
        <div className="flex gap-4 items-center">
          <div
            className="font-semibold text-sm"
            style={{ color: `#${selectedMemberColor}` }}
          >
            {selectedMember.name}{" "}
            <span className="text-white">{isOwner ? "(właściciel)" : ""}</span>
          </div>
        </div>
      </div>

      <MemberSyncButton member={selectedMember} />
    </div>
    <ScrollArea className="h-[calc(100vh-318px)]">
      <MemberData member={selectedMember} />
    </ScrollArea>
  </>
);
