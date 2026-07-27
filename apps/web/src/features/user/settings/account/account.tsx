import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Trash2, UserCog } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { authClient } from "@/lib/auth-client";
import { useUser } from "@/hooks/api/user/use-user";
import { useQueryClient } from "@tanstack/react-query";
import { useUsersControllerDeleteAccount } from "@lootlog/api-client/react-query/main/users";

export const AccountSettings: FC = () => {
  const { t } = useTranslation();
  const { user, isPending } = useUser();
  const deleteAccount = useUsersControllerDeleteAccount();
  const queryClient = useQueryClient();
  const isDeleteDisabled = isPending || !user?.name || deleteAccount.isPending;

  const handleLogout = async () => {
    await authClient.signOut();
    queryClient.clear();
    window.location.replace("/");
  };

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
        <Card className="gap-4 border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <UserCog className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">
                {t("settings.account.title")}
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                {t("settings.account.description")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="gap-3 border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <LogOut className="size-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold leading-tight">
                {t("settings.account.session.title")}
              </h3>
              <p className="text-xs text-muted-foreground leading-tight">
                {t("settings.account.session.description")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center sm:w-auto"
            onClick={handleLogout}
          >
            <LogOut className="size-3.5" />
            {t("settings.account.session.logout")}
          </Button>
        </Card>

        <Card className="gap-3 border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-2.5">
              <Trash2 className="size-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold leading-tight">
                {t("settings.account.dangerZone.title")}
              </h3>
              <p className="text-xs text-muted-foreground leading-tight">
                {t("settings.account.dangerZone.description")}
              </p>
            </div>
          </div>
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
        </Card>
      </div>
    </ScrollArea>
  );
};
