import { SearchInput } from "@/components/ui/search-input";
import { useState, useMemo, useRef } from "react";
import { cn } from "@/utils/cn";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { useGuildMembers } from "@/hooks/api/members/use-guild-members";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { MembersPanelContent } from "@/features/guild-settings/members-settings/components/members-panel";
import { RefreshMembersButton } from "@/features/guild-settings/members-settings/components/refresh-members-button";
import { getColorFromRole } from "@/utils/get-color-from-role";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { RefreshStatusProvider } from "@/features/guild-settings/members-settings/contexts/refresh-status-context";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Users } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Permission } from "@lootlog/types";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import {
  SelectorPanelProvider,
  useSelectorPanel,
} from "@/components/selector-panel";
import { MemberListItem } from "@/features/guild-settings/members-settings/components/member-list-item";

const MembersSettingsHeader = () => (
  <Card className="mx-3 mt-3 gap-4 border-border bg-card/60 p-4 backdrop-blur-sm shrink-0">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="p-2.5 rounded-xl bg-primary/10 shadow-inner shadow-primary/10">
        <Users className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold leading-tight">
          Ustawienia członków
        </h2>
        <p className="text-xs text-muted-foreground leading-tight">
          Zarządzaj członkami lootloga
        </p>
      </div>
    </div>
    <RefreshMembersButton />
  </Card>
);

const MembersSettingsContent = () => {
  const [showInactive, setShowInactive] = useState(false);
  const showInactiveCheckboxId = "show-inactive-members";
  const { data: members } = useGuildMembers(showInactive);
  const [searchValue, setSearchValue] = useState("");
  const { data: guild } = useGuild({});
  const {
    selectedItem: selectedMember,
    setSelectedItem: setSelectedMember,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    isMobile,
  } = useSelectorPanel<GuildMember>();

  const filteredMembers = useMemo(() => {
    if (!members || !guild) return [];
    const search = searchValue.trim().toLowerCase();
    const filtered = search
      ? members.filter((member) => member.name.toLowerCase().includes(search))
      : members;

    return filtered.sort((a, b) => {
      const aIsOwner = a.userId === guild.ownerId;
      const bIsOwner = b.userId === guild.ownerId;
      if (aIsOwner && !bIsOwner) return -1;
      if (!aIsOwner && bIsOwner) return 1;
      if (a.active !== b.active) return a.active ? -1 : 1;
      const aIsAdmin = a.roles.some((r) =>
        r.permissions.includes(Permission.ADMIN),
      );
      const bIsAdmin = b.roles.some((r) =>
        r.permissions.includes(Permission.ADMIN),
      );
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      const aMaxPosition = Math.max(...a.roles.map((r) => r.position ?? 0), 0);
      const bMaxPosition = Math.max(...b.roles.map((r) => r.position ?? 0), 0);
      if (aMaxPosition !== bMaxPosition) return bMaxPosition - aMaxPosition;

      return a.name.localeCompare(b.name);
    });
  }, [members, searchValue, guild]);

  const selectedMemberColor = useMemo(() => {
    if (!selectedMember) return undefined;
    return getColorFromRole(selectedMember.roles);
  }, [selectedMember]);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredMembers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 5,
    measureElement: (element) => element.getBoundingClientRect().height + 6,
  });

  return (
    <>
      {isMobile && (
        <Drawer
          open={isMobileDrawerOpen}
          onOpenChange={(open) => {
            setIsMobileDrawerOpen(open);
            if (!open) setSelectedMember(null);
          }}
          shouldScaleBackground={false}
        >
          <DrawerContent className="p-0 h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
            <DrawerHeader className="border-b px-4 py-3 shrink-0">
              <DrawerTitle className="flex items-center gap-3">
                {selectedMember && (
                  <span style={{ color: `#${selectedMemberColor}` }}>
                    {selectedMember.name}
                  </span>
                )}
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              {selectedMember && (
                <MembersPanelContent
                  selectedMemberColor={selectedMemberColor}
                  isOwner={selectedMember.userId === guild?.ownerId}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        <MembersSettingsHeader />
        <Card className="mx-3 mt-3 shrink-0 border-border bg-card/40 p-3 backdrop-blur-sm flex gap-2 items-center">
          <SearchInput
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Szukaj członka..."
            className="h-9"
            wrapperClassName="flex-1"
          />
          <Label
            htmlFor={showInactiveCheckboxId}
            className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap"
          >
            <Checkbox
              id={showInactiveCheckboxId}
              checked={showInactive}
              onCheckedChange={(checked) => setShowInactive(checked === true)}
            />
            Nieaktywni
          </Label>
        </Card>

        <div className="flex-1 flex min-h-0 overflow-hidden bg-background/50">
          <div
            className={cn(
              "flex flex-col h-full min-w-0 overflow-hidden",
              !isMobile && selectedMember
                ? "w-1/3 min-w-[220px] max-w-[350px] border-r"
                : "flex-1",
            )}
          >
            <ScrollArea ref={parentRef} className="flex-1 h-full">
              <div className="p-3 space-y-1.5">
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const member = filteredMembers[virtualItem.index];
                    if (!member) return null;

                    return (
                      <div
                        key={member.id}
                        data-index={virtualItem.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        <MemberListItem
                          member={member}
                          isOwner={member.userId === guild?.ownerId}
                        />
                      </div>
                    );
                  })}
                </div>
                {filteredMembers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="size-12 mb-4 opacity-30" />
                    <p className="text-sm font-medium">
                      Nie znaleziono członków
                    </p>
                    <p className="text-xs mt-1">
                      Spróbuj zmienić kryteria wyszukiwania
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {!isMobile && selectedMember && (
            <div className="h-full flex-1 min-w-0">
              <div className="h-full min-w-[400px]">
                <MembersPanelContent
                  selectedMemberColor={selectedMemberColor}
                  isOwner={selectedMember.userId === guild?.ownerId}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const MembersSettings = () => {
  return (
    <RefreshStatusProvider>
      <SelectorPanelProvider<GuildMember>>
        <MembersSettingsContent />
      </SelectorPanelProvider>
    </RefreshStatusProvider>
  );
};
