import { SearchInput } from "@/components/ui/search-input";
import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/utils/cn";

import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { GuildMember } from "@/hooks/api/use-guild-member";
import { MembersPanelContent } from "@/screens/members-settings/components/members-panel";
import { MemberItem } from "@/screens/members-settings/components/member-item";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { useGuild } from "@/hooks/api/use-guild";

export const MembersSettings = () => {
  const { data: members } = useGuildMembers();
  const [searchValue, setSearchValue] = useState("");
  const [selectedMember, setSelectedMember] = useState<GuildMember | null>(
    null
  );
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { data: guild } = useGuild({});

  const prevSelectedMember = useRef<GuildMember | null>(null);

  useEffect(() => {
    setShouldAnimate(
      prevSelectedMember.current === null && selectedMember !== null
    );
    prevSelectedMember.current = selectedMember;
  }, [selectedMember]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const search = searchValue.trim().toLowerCase();
    if (!search) return members;
    return members.filter((member) =>
      member.name.toLowerCase().includes(search)
    );
  }, [members, searchValue]);

  const selectedMemberColor = useMemo(() => {
    if (!selectedMember) return undefined;
    return getColorFromRole(selectedMember.roles);
  }, [selectedMember]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-6">
        <div className="text-lg font-semibold">Ustawienia członków</div>
        <div className="text-sm text-gray-500">
          Ustawienia członków, którzy mogą być przypisani do ról na serwerze
          Discord. Tutaj możesz przypisać uprawnienia do ról.
        </div>
      </div>
      <div className="p-4 border-t box-border">
        <SearchInput
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Szukaj roli..."
        />
      </div>
      <div
        className={cn("border-t grid grid-cols-[1fr] flex-1 box-border", {
          "grid-cols-[theme(width.64)_1fr]": selectedMember,
        })}
      >
        <ScrollArea className="flex flex-col h-[calc(100vh-280px)]">
          {filteredMembers?.map((member) => (
            <MemberItem
              key={member.id}
              member={member}
              active={selectedMember?.id === member.id}
              onSelect={() => setSelectedMember(member)}
              showActions={!selectedMember}
              isOwner={member.userId === guild?.ownerId}
            />
          ))}
        </ScrollArea>
        <AnimatePresence>
          {selectedMember &&
            (shouldAnimate ? (
              <motion.div
                className="border-l"
                initial={{ opacity: 0, x: 64 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                key={selectedMember.id}
              >
                <MembersPanelContent
                  selectedMember={selectedMember}
                  setSelectedMember={setSelectedMember}
                  selectedMemberColor={selectedMemberColor}
                  isOwner={selectedMember.userId === guild?.ownerId}
                />
              </motion.div>
            ) : (
              <div className="border-l">
                <MembersPanelContent
                  key={selectedMember.id}
                  selectedMember={selectedMember}
                  setSelectedMember={setSelectedMember}
                  selectedMemberColor={selectedMemberColor}
                />
              </div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
