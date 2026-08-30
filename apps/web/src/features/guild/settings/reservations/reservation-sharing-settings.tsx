import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CircleAlert, Copy, Link2, Plus, Unlink, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getListReservationSharesQueryKey,
  useCreateReservationShareInvitation,
  useListReservationShares,
  useRevokeReservationShare,
  useRevokeReservationShareInvitation,
} from "@lootlog/api-client/react-query/main/reservation-sharing";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { Input } from "@lootlog/ui/components/input";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@lootlog/ui/components/alert";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { getReservationErrorMessage } from "@/features/guild/reservations/get-reservation-error-message";

type CreatedInvitation = { id: string; inviteUrl: string };

export function ReservationSharingSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const guildId = useGuildId() ?? "";
  const [createdInvitation, setCreatedInvitation] =
    useState<CreatedInvitation | null>(null);
  const queryKey = getListReservationSharesQueryKey({ guildId });
  const sharesQuery = useListReservationShares(
    { guildId },
    { query: { enabled: Boolean(guildId) } },
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const createMutation = useCreateReservationShareInvitation({
    mutation: {
      onSuccess: async (invitation) => {
        setCreatedInvitation({
          id: invitation.id,
          inviteUrl: new URL(
            invitation.invitePath,
            window.location.origin,
          ).toString(),
        });
        await refresh();
      },
      onError: (error) => toast.error(getReservationErrorMessage(error, t)),
    },
  });
  const revokeInvitationMutation = useRevokeReservationShareInvitation({
    mutation: {
      onSuccess: async (_data, variables) => {
        setCreatedInvitation((current) =>
          current?.id === variables.pathParams.invitationId ? null : current,
        );
        await refresh();
      },
      onError: (error) => toast.error(getReservationErrorMessage(error, t)),
    },
  });
  const revokeShareMutation = useRevokeReservationShare({
    mutation: {
      onSuccess: refresh,
      onError: (error) => toast.error(getReservationErrorMessage(error, t)),
    },
  });

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Users className="size-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              {t("settings.reservations.sharing.title")}
            </h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              {t("settings.reservations.sharing.description")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="w-full lg:w-auto"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate({ pathParams: { guildId } })}
        >
          <Plus />
          {t("settings.reservations.sharing.createInvite")}
        </Button>
      </div>

      {createdInvitation && (
        <div
          className="space-y-3 border-b border-border bg-primary/5 p-4"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="size-4 text-primary" />
            <p>{t("settings.reservations.sharing.inviteReady")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={createdInvitation.inviteUrl}
              readOnly
              aria-label={t("settings.reservations.sharing.inviteLink")}
              className="min-w-0 font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    createdInvitation.inviteUrl,
                  );
                  toast.success(t("settings.reservations.sharing.copied"));
                } catch {
                  toast.error(t("settings.reservations.sharing.copyError"));
                }
              }}
            >
              <Copy />
              {t("settings.reservations.sharing.copy")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings.reservations.sharing.singleUseNotice")}
          </p>
        </div>
      )}

      {sharesQuery.isError ? (
        <Alert variant="destructive" className="m-4 w-auto">
          <CircleAlert />
          <AlertTitle>
            {t("settings.reservations.sharing.loadError")}
          </AlertTitle>
          <AlertDescription>
            {t("settings.reservations.sharing.loadErrorDescription")}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sharesQuery.refetch()}
            >
              {t("common.actions.retry")}
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <div className="grid md:grid-cols-2" aria-busy={sharesQuery.isPending}>
          <section
            className="border-b border-border p-4 md:border-r md:border-b-0"
            aria-labelledby="reservation-partners-title"
          >
            <h3
              id="reservation-partners-title"
              className="mb-3 text-sm font-semibold"
            >
              {t("settings.reservations.sharing.partners")}
            </h3>
            {sharesQuery.isPending ? (
              <div className="space-y-2" aria-hidden="true">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-4/5" />
              </div>
            ) : sharesQuery.data?.shares.length ? (
              <ul className="divide-y divide-border">
                {sharesQuery.data.shares.map((share) => (
                  <li key={share.id} className="flex items-center gap-3 py-2">
                    <Link2 className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {share.partner.name}
                    </span>
                    <ConfirmDeleteDialog
                      title={t("settings.reservations.sharing.disconnectTitle")}
                      description={t(
                        "settings.reservations.sharing.disconnectDescription",
                        { name: share.partner.name },
                      )}
                      confirmButtonLabel={t(
                        "settings.reservations.sharing.disconnect",
                      )}
                      cancelButtonLabel={t("common.cancel")}
                      disabled={revokeShareMutation.isPending}
                      onConfirm={() =>
                        revokeShareMutation.mutateAsync({
                          pathParams: { guildId, shareId: share.id },
                        })
                      }
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 text-destructive"
                          aria-label={t(
                            "settings.reservations.sharing.disconnectOrganization",
                            { name: share.partner.name },
                          )}
                        >
                          <Unlink />
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("settings.reservations.sharing.noPartners")}
              </p>
            )}
          </section>

          <section
            className="p-4"
            aria-labelledby="reservation-invitations-title"
          >
            <h3
              id="reservation-invitations-title"
              className="mb-3 text-sm font-semibold"
            >
              {t("settings.reservations.sharing.pending")}
            </h3>
            {sharesQuery.isPending ? (
              <div className="space-y-2" aria-hidden="true">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-3/4" />
              </div>
            ) : sharesQuery.data?.pendingInvitations.length ? (
              <ul className="divide-y divide-border">
                {sharesQuery.data.pendingInvitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {t("settings.reservations.sharing.pendingInvite")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("settings.reservations.sharing.expires", {
                          date: format(
                            new Date(invitation.expiresAt),
                            "d MMM, HH:mm",
                            { locale: pl },
                          ),
                        })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={revokeInvitationMutation.isPending}
                      onClick={() =>
                        revokeInvitationMutation.mutate({
                          pathParams: {
                            guildId,
                            invitationId: invitation.id,
                          },
                        })
                      }
                    >
                      {t("settings.reservations.sharing.revoke")}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("settings.reservations.sharing.noPending")}
              </p>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}
