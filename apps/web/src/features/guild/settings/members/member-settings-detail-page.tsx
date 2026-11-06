import { RefreshStatusProvider } from "@/features/guild/settings/members/contexts/refresh-status-provider";
import { MemberSettingsDetailPageContent } from "./member-settings-detail-page-content";

export const MemberSettingsDetailPage = () => (
  <RefreshStatusProvider>
    <MemberSettingsDetailPageContent />
  </RefreshStatusProvider>
);
