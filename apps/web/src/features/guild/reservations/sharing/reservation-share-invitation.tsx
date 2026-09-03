import { useState } from "react";
import { ArrowRight, CheckCircle2, Link2, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ROUTES } from "@/config/routes";
import {
  useAcceptReservationShareInvitation,
  usePreviewReservationShareInvitation,
} from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Card } from "@lootlog/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import { getReservationErrorMessage } from "../get-reservation-error-message";

type ReservationShareInvitationProps = { token: string };

export function ReservationShareInvitation({
  token,
}: ReservationShareInvitationProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [targetGuildId, setTargetGuildId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const previewQuery = usePreviewReservationShareInvitation({ token });
  const acceptMutation = useAcceptReservationShareInvitation({
    mutation: {
      onSuccess: () => setAccepted(true),
      onError: (error) => toast.error(getReservationErrorMessage(error, t)),
    },
  });

  if (accepted) {
    return (
      <Card className="w-full max-w-xl gap-0 py-0">
        <div
          className="flex min-h-80 flex-col items-center justify-center px-6 py-8 text-center sm:px-10"
          aria-live="polite"
        >
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-signal-ready/10 text-signal-ready">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em]">
            {t("reservations.sharing.acceptedTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("reservations.sharing.acceptedDescription")}
          </p>
          <Button
            type="button"
            className="mt-6 w-full sm:w-auto"
            onClick={() =>
              targetGuildId &&
              navigate({
                to: ROUTES.guild.settings.reservationsSettings(targetGuildId),
              })
            }
          >
            {t("reservations.sharing.openSettings")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    );
  }

  if (previewQuery.isError) {
    return (
      <Card className="w-full max-w-xl gap-0 py-0" role="alert">
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-8 text-center sm:px-10">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em]">
            {t("reservations.sharing.invalidTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("reservations.sharing.invalidDescription")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full sm:w-auto"
            onClick={() => navigate({ to: ROUTES.user.dashboard })}
          >
            {t("common.routeErrors.actions.goToDashboard")}
          </Button>
        </div>
      </Card>
    );
  }

  if (!previewQuery.data) {
    return (
      <Card className="w-full max-w-xl gap-0 py-0" aria-busy="true">
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-8 text-center sm:px-10">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Spinner className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em]">
            {t("reservations.sharing.loadingTitle")}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("reservations.sharing.loadingDescription")}
          </p>
        </div>
      </Card>
    );
  }

  const organizations = previewQuery.data?.eligibleTargetOrganizations ?? [];
  return (
    <Card className="w-full max-w-xl gap-0 py-0">
      <div className="flex items-start gap-4 px-6 py-6 sm:px-8 sm:py-7">
        <Avatar className="size-12 shrink-0 rounded-xl border border-border bg-muted">
          <AvatarImage
            src={previewQuery.data.sourceOrganization.iconUrl ?? undefined}
            alt=""
          />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
            <Link2 className="size-5" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-[-0.02em]">
            {t("reservations.sharing.invitationTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("reservations.sharing.invitationDescription", {
              organization: previewQuery.data.sourceOrganization.name,
            })}
          </p>
        </div>
      </div>
      <div className="border-t border-border px-6 py-6 sm:px-8">
        <div className="space-y-2">
          <label
            className="text-sm font-semibold"
            htmlFor="target-organization"
          >
            {t("reservations.sharing.targetOrganizationLabel")}
          </label>
          <Select
            value={targetGuildId}
            onValueChange={setTargetGuildId}
            items={organizations.map((organization) => ({
              value: organization.id,
              label: organization.name,
            }))}
          >
            <SelectTrigger id="target-organization" className="w-full">
              <SelectValue
                placeholder={t("reservations.sharing.selectOrganization")}
              />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>
                  {organization.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {organizations.length === 0 ? (
            <div className="flex items-start gap-2 pt-1 text-sm leading-relaxed text-muted-foreground">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-signal-timer"
                aria-hidden="true"
              />
              <p>{t("reservations.sharing.noEligibleOrganizations")}</p>
            </div>
          ) : null}
          <Button
            type="button"
            className="mt-4 w-full"
            size="lg"
            disabled={!targetGuildId || acceptMutation.isPending}
            onClick={() =>
              targetGuildId &&
              acceptMutation.mutate({
                pathParams: { token },
                data: { targetGuildId },
              })
            }
          >
            {acceptMutation.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <Link2 className="size-4" aria-hidden="true" />
            )}
            {acceptMutation.isPending
              ? t("reservations.sharing.connecting")
              : t("reservations.sharing.accept")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
