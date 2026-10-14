import { BandSection } from "@/components/common/band-section";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { useState } from "react";
import {
  Ban,
  CircleAlert,
  Copy,
  Hourglass,
  Link2,
  Plus,
  Unlink,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "cn";
import {
  getListReservationSharesQueryKey,
  useCreateReservationShareInvitation,
  useListReservationShares,
  useRevokeReservationShare,
  useRevokeReservationShareInvitation,
} from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";

import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { Input } from "@lootlog/ui/components/input";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@lootlog/ui/components/alert";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { getReservationErrorMessage } from "@/features/guild/reservations/get-reservation-error-message";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { ReservationShareGroup } from "./reservation-share-group";

type CreatedInvitation = { id: string; inviteUrl: string };

type InvitationLink = { invitePath: string } | { inviteUrl: string };

function buildInvitationUrl(invitation: InvitationLink): string {
  const invitePath =
    "invitePath" in invitation
      ? invitation.invitePath
      : new URL(invitation.inviteUrl).pathname;

  return new URL(invitePath, window.location.origin).toString();
}

const SHARE_TILE_CLASS = cn(
  "flex min-h-14 items-center gap-3 py-2",
  LIST_TILE_RULE_CLASS,
  LIST_TILE_INSET_CLASS,
);

/** Removing a partner or an invitation is quiet until hovered. */
const REMOVE_BUTTON_CLASS =
  "text-muted-foreground hover:bg-destructive/10 hover:text-destructive";

export function ReservationSharingSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isCopying, setIsCopying] = useState(false);
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
          inviteUrl: buildInvitationUrl(invitation),
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
    <BandSection
      id="reservation-sharing"
      title={t("settings.reservations.sharing.title")}
      description={t("settings.reservations.sharing.description")}
      tiled
      trailing={
        <Button
          type="button"
          size="sm"
          loading={createMutation.isPending}
          icon=<Plus />
          onClick={() => createMutation.mutate({ pathParams: { guildId } })}
        >
          {t("settings.reservations.sharing.createInvite")}
        </Button>
      }
    >
      {createdInvitation && (
        <div
          data-list-tile
          className={cn("py-4", LIST_TILE_RULE_CLASS, LIST_TILE_INSET_CLASS)}
          aria-live="polite"
        >
          <div className="flex max-w-3xl flex-col gap-3">
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
                loading={isCopying}
                icon=<Copy />
                onClick={() => {
                  if (isCopying) return;
                  setIsCopying(true);

                  return Promise.resolve()
                    .then(() =>
                      navigator.clipboard.writeText(
                        createdInvitation.inviteUrl,
                      ),
                    )
                    .then(() => {
                      toast.success(t("settings.reservations.sharing.copied"));
                    })
                    .catch(() => {
                      toast.error(t("settings.reservations.sharing.copyError"));
                    })
                    .finally(() => setIsCopying(false));
                }}
              >
                {t("settings.reservations.sharing.copy")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.reservations.sharing.singleUseNotice")}
            </p>
          </div>
        </div>
      )}

      {sharesQuery.isError ? (
        <div className={cn("py-5", LIST_TILE_INSET_CLASS)}>
          <Alert variant="destructive" className="max-w-3xl">
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
                loading={sharesQuery.isFetching}
                onClick={() => sharesQuery.refetch()}
              >
                {t("common.actions.retry")}
              </Button>
            </AlertAction>
          </Alert>
        </div>
      ) : (
        <>
          <ReservationShareGroup
            id="reservation-partners-title"
            title={t("settings.reservations.sharing.partners")}
            count={sharesQuery.data?.shares.length}
            isPending={sharesQuery.isPending}
            emptyLabel={t("settings.reservations.sharing.noPartners")}
            emptyIcon={Link2}
          >
            {sharesQuery.data?.shares.map((share) => (
              <li key={share.id} data-list-tile className={SHARE_TILE_CLASS}>
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
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
                      size="icon-sm"
                      className={REMOVE_BUTTON_CLASS}
                      aria-label={t(
                        "settings.reservations.sharing.disconnectOrganization",
                        { name: share.partner.name },
                      )}
                    >
                      <Unlink className="size-4" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ReservationShareGroup>
          <ReservationShareGroup
            id="reservation-invitations-title"
            title={t("settings.reservations.sharing.pending")}
            count={sharesQuery.data?.pendingInvitations.length}
            isPending={sharesQuery.isPending}
            emptyLabel={t("settings.reservations.sharing.noPending")}
            emptyIcon={Hourglass}
          >
            {sharesQuery.data?.pendingInvitations.map((invitation) => (
              <li
                key={invitation.id}
                data-list-tile
                className={SHARE_TILE_CLASS}
              >
                <Hourglass className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">
                    {t("settings.reservations.sharing.pendingInvite")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("settings.reservations.sharing.expires", {
                      date: timestampToDate(invitation.expiresAt),
                    })}
                  </span>
                </span>
                <ConfirmDeleteDialog
                  title={t("settings.reservations.sharing.revokeTitle")}
                  description={t(
                    "settings.reservations.sharing.revokeDescription",
                  )}
                  confirmButtonLabel={t("settings.reservations.sharing.revoke")}
                  cancelButtonLabel={t("common.cancel")}
                  disabled={revokeInvitationMutation.isPending}
                  onConfirm={() =>
                    revokeInvitationMutation.mutateAsync({
                      pathParams: { guildId, invitationId: invitation.id },
                    })
                  }
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={REMOVE_BUTTON_CLASS}
                      aria-label={t(
                        "settings.reservations.sharing.revokeInvitation",
                      )}
                    >
                      <Ban className="size-4" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ReservationShareGroup>
        </>
      )}
    </BandSection>
  );
}
