import { BandSection } from "@/components/common/band-section";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Trash2 } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { authClient } from "@/lib/auth-client";
import { useUser } from "@/hooks/api/user/use-user";
import { useLogout } from "@/hooks/auth/use-logout";
import { useQueryClient } from "@tanstack/react-query";
import { useUsersControllerDeleteAccount } from "@lootlog/client/main";

export const AccountSettings: FC = () => {
  const { t } = useTranslation();
  const { user, isPending } = useUser();
  const deleteAccount = useUsersControllerDeleteAccount();
  const queryClient = useQueryClient();
  const { logout, isPending: isLoggingOut } = useLogout();
  const isDeleteDisabled = isPending || !user?.name || deleteAccount.isPending;

  const handleDeleteAccount = async () => {
    await deleteAccount.mutateAsync();

    const deleteUserResponse = await authClient.deleteUser();

    if (deleteUserResponse.error) {
      throw new Error(
        deleteUserResponse.error.message ?? "Failed to delete auth account",
      );
    }

    queryClient.clear();
    window.location.replace("/");
  };

  return (
    <SettingsTabPage title={t("settings.account.title")}>
      <BandSection
        id="account-session"
        title={t("settings.account.session.title")}
        description={t("settings.account.session.description")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            loading={isLoggingOut}
            icon=<LogOut className="size-4" />
            onClick={logout}
          >
            {t("settings.account.session.logout")}
          </Button>
        </div>
      </BandSection>

      <BandSection
        id="account-delete"
        title={t("settings.account.dangerZone.title")}
        description={t("settings.account.dangerZone.description")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <ConfirmDeleteDialog
            onConfirm={handleDeleteAccount}
            title={t("settings.account.dangerZone.deleteConfirmTitle")}
            description={t(
              "settings.account.dangerZone.deleteConfirmDescription",
            )}
            confirmText={user?.name}
            confirmLabel={t("settings.account.dangerZone.deleteConfirmLabel", {
              name: user?.name,
            })}
            confirmButtonLabel={t(
              "settings.account.dangerZone.deleteConfirmButton",
            )}
            disabled={isDeleteDisabled}
            trigger={
              <Button variant="destructive" disabled={isDeleteDisabled}>
                <Trash2 className="size-4" />
                {t("settings.account.dangerZone.deleteAccount")}
              </Button>
            }
          />
        </div>
      </BandSection>
    </SettingsTabPage>
  );
};
