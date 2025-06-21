import { ScrollArea } from "@/components/ui/scroll-area";
import { GuildRole } from "@/hooks/api/use-guild-roles";
import { RolesSettingsForm } from "@/screens/roles-settings/components/roles-settings-form";
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
  <>
    <div className="p-4 border-b h-12 flex flex-row gap-4 items-center">
      <ArrowLeft
        className="cursor-pointer"
        onClick={() => setSelectedRole(null)}
      />
      <div className="flex gap-4 items-center">
        <div
          className="size-4 rounded-full"
          style={{ backgroundColor: `#${selectedRoleColor}` }}
        />
        <div className="font-semibold text-sm">{selectedRole.name}</div>
      </div>
    </div>
    <ScrollArea className="h-[calc(100vh-230px)]">
      <RolesSettingsForm role={selectedRole} />
    </ScrollArea>
  </>
);
