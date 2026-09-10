import { RefreshStatusProvider } from "@/features/guild/settings/members/contexts/refresh-status-provider";
import { MembersSettingsContent } from "@/features/guild/settings/members/members-settings-content";

export const MembersSettings = () => {
  return (
    <RefreshStatusProvider>
      <MembersSettingsContent />
    </RefreshStatusProvider>
  );
};
