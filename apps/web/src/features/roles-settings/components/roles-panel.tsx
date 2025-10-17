import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { GuildRole } from "@/hooks/api/guilds/use-guild-roles";
import { RolesSettingsForm } from "@/features/roles-settings/components/roles-settings-form";
import { ArrowLeft } from "lucide-react";
import { FC } from "react";

export type RolePanelContentProps = {
  selectedRole: GuildRole;
  setSelectedRole: (role: GuildRole | null) => void;
  selectedRoleColor: string | undefined;
};

export const RolePanelContent: FC<RolePanelContentProps> = ({
  selectedRole,
  setSelectedRole,
  selectedRoleColor,
}) => (
  <div className="flex flex-col h-full min-h-0 overflow-hidden">
    <div className="p-4 border-b flex flex-row gap-4 items-center min-h-12 flex-shrink-0">
      <ArrowLeft
        className="cursor-pointer"
        onClick={() => setSelectedRole(null)}
      />
      <div className="flex gap-4 items-center">
        <div
          className="size-4 rounded-full"
          style={{ backgroundColor: `#${selectedRoleColor}` }}
        />
        <div className="font-semibold text-sm truncate">
          {selectedRole.name}
        </div>
      </div>
    </div>
    <ScrollArea className="flex-1 min-h-0 overflow-hidden">
      <RolesSettingsForm role={selectedRole} />
    </ScrollArea>
  </div>
);
