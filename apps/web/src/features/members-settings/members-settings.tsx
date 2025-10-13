import { SearchInput } from "@/components/ui/search-input";
import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { GuildMember } from "@/hooks/api/use-guild-member";
import { MembersPanelContent } from "@/features/members-settings/components/members-panel";
import { MemberItem } from "@/features/members-settings/components/member-item";
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

  const handleSelectMember = (member: GuildMember) => {
    if (selectedMember === null) {
      setShouldAnimate(true);
    }
    setSelectedMember(member);
  };

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

  const isDirty = false;

  return (
    <div className="h-full flex flex-col min-h-0">
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
          placeholder="Szukaj członka..."
        />
      </div>
      <div
        className={cn(
          "border-t grid flex-1 box-border min-h-0 transition-[grid-template-columns]",
          selectedMember
            ? "grid-cols-1 md:grid-cols-[theme(width.64)_1fr]"
            : "grid-cols-1 md:grid-cols-[1fr]"
        )}
      >
        <ScrollArea
          className={cn(
            "flex flex-col h-full min-h-0",
            selectedMember && "hidden md:flex"
          )}
        >
          {filteredMembers?.map((member) => (
            <MemberItem
              key={member.id}
              member={member}
              active={selectedMember?.id === member.id}
              onSelect={() => handleSelectMember(member)}
              showActions={!selectedMember}
              isOwner={member.userId === guild?.ownerId}
            />
          ))}
        </ScrollArea>
        <AnimatePresence mode="popLayout">
          {selectedMember &&
            (shouldAnimate ? (
              <motion.div
                className={cn(
                  "border-l min-h-0 flex flex-col",
                  "md:border-l border-l-0"
                )}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
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
              <div
                className={cn(
                  "border-l min-h-0 flex flex-col",
                  "md:border-l border-l-0"
                )}
                key={selectedMember.id}
              >
                <MembersPanelContent
                  selectedMember={selectedMember}
                  setSelectedMember={setSelectedMember}
                  selectedMemberColor={selectedMemberColor}
                  isOwner={selectedMember.userId === guild?.ownerId}
                />
              </div>
            ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {isDirty && (
          <motion.div
            key="unsaved-bar-members"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{
              type: "spring",
              stiffness: 520,
              damping: 28,
              mass: 0.7,
            }}
            className="pointer-events-none fixed bottom-0 left-0 right-0 md:left-[theme(width.64)] z-50 flex justify-center px-4 pb-3"
          >
            <motion.div
              layout
              layoutId="unsaved-bar-inner-members"
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 30,
                mass: 0.6,
              }}
              className="pointer-events-auto w-full max-w-3xl rounded-md border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 shadow-md flex items-center justify-between gap-4"
            >
              <p className="text-sm font-medium">Masz niezapisane zmiany</p>
              <div className="flex gap-2">
                <button
                  className="text-sm font-medium opacity-70 hover:opacity-100 transition"
                  type="button"
                >
                  Resetuj
                </button>
                <button
                  className="text-sm font-medium bg-primary text-primary-foreground rounded px-3 py-1.5"
                  type="button"
                >
                  Zapisz
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
