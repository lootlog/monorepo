import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { PageHeader } from "@/components/common/page-header";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Trash2, UserCog } from "lucide-react";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
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
  const { logout } = useLogout();
  const isDeleteDisabled = isPending || !user?.name || deleteAccount.isPending;

  const handleDeleteAccount = async () => {
    await deleteAccount.mutateAsync();

    const deleteUserResponse = await authClient.deleteUser();

    if (
      typeof deleteUserResponse === "object" &&
      deleteUserResponse !== null &&
      "error" in deleteUserResponse &&
      deleteUserResponse.error
    ) {
      const error = deleteUserResponse.error;
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
          ? error.message
          : "Failed to delete auth account";

      throw new Error(errorMessage);
    }

    queryClient.clear();
    window.location.replace("/");
  };

  return (
    <ScrollArea className="h-full">
      <div className="px-3 pb-3 flex flex-col gap-4">
        <PageHeader
          icon={UserCog}
          title={t("settings.account.title")}
          description={t("settings.account.description")}
        />

        <SectionCard>
          <SectionCardHeader
            icon={LogOut}
            title={t("settings.account.session.title")}
            description={t("settings.account.session.description")}
          />
          <SectionCardContent>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center sm:w-auto"
              onClick={logout}
            >
              <LogOut className="size-3.5" />
              {t("settings.account.session.logout")}
            </Button>
          </SectionCardContent>
        </SectionCard>

        <SectionCard>
          <SectionCardHeader
            icon={Trash2}
            title={t("settings.account.dangerZone.title")}
            description={t("settings.account.dangerZone.description")}
          />
          <SectionCardContent>
            <ConfirmDeleteDialog
              onConfirm={handleDeleteAccount}
              title={t("settings.account.dangerZone.deleteConfirmTitle")}
              description={t(
                "settings.account.dangerZone.deleteConfirmDescription",
              )}
              confirmText={user?.name}
              confirmLabel={t(
                "settings.account.dangerZone.deleteConfirmLabel",
                {
                  name: user?.name,
                },
              )}
              confirmButtonLabel={t(
                "settings.account.dangerZone.deleteConfirmButton",
              )}
              disabled={isDeleteDisabled}
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-center sm:w-auto"
                  disabled={isDeleteDisabled}
                >
                  <Trash2 className="size-3.5" />
                  {t("settings.account.dangerZone.deleteAccount")}
                </Button>
              }
            />
          </SectionCardContent>
        </SectionCard>
      </div>
    </ScrollArea>
  );
};
