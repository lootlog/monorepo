import { BandSection } from "@/components/common/band-section";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
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
import { Label } from "@lootlog/ui/components/label";
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

const SECTION_ID = "reservation-share-invitation";

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

  const heading = (
    <h1 className="sr-only">{t("reservations.sharing.standaloneTitle")}</h1>
  );

  if (accepted) {
    return (
      <div aria-live="polite">
        {heading}
        <SettingsListEmpty
          icon={CheckCircle2}
          title={t("reservations.sharing.acceptedTitle")}
          description={t("reservations.sharing.acceptedDescription")}
          action={
            <Button
              type="button"
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
          }
        />
      </div>
    );
  }

  if (previewQuery.isError) {
    return (
      <div role="alert">
        {heading}
        <SettingsListEmpty
          icon={TriangleAlert}
          title={t("reservations.sharing.invalidTitle")}
          description={t("reservations.sharing.invalidDescription")}
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: ROUTES.user.dashboard })}
            >
              {t("common.routeErrors.actions.goToDashboard")}
            </Button>
          }
        />
      </div>
    );
  }

  if (!previewQuery.data) {
    return (
      <div aria-busy="true">
        {heading}
        <BandSection
          id={SECTION_ID}
          title={t("reservations.sharing.loadingTitle")}
          description={t("reservations.sharing.loadingDescription")}
        >
          <Spinner className="size-6" />
        </BandSection>
      </div>
    );
  }

  const { sourceOrganization, eligibleTargetOrganizations: organizations } =
    previewQuery.data;

  return (
    <>
      {heading}
      <BandSection
        id={SECTION_ID}
        title={t("reservations.sharing.invitationTitle")}
        description={t("reservations.sharing.invitationDescription", {
          organization: sourceOrganization.name,
        })}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 shrink-0 rounded-lg border border-border bg-muted">
            <AvatarImage src={sourceOrganization.iconUrl ?? undefined} alt="" />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
              <Link2 className="size-4" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <p className="min-w-0 truncate text-sm font-semibold">
            {sourceOrganization.name}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="target-organization">
              {t("reservations.sharing.targetOrganizationLabel")}
            </Label>
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
            {organizations.length === 0 && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <TriangleAlert
                  className="mt-0.5 size-4 shrink-0 text-signal-timer"
                  aria-hidden="true"
                />
                {t("reservations.sharing.noEligibleOrganizations")}
              </p>
            )}
          </div>
        </div>

        <div>
          <Button
            type="button"
            disabled={!targetGuildId}
            loading={acceptMutation.isPending}
            icon=<Link2 className="size-4" aria-hidden="true" />
            onClick={() =>
              targetGuildId &&
              acceptMutation.mutate({
                pathParams: { token },
                data: { targetGuildId },
              })
            }
          >
            {t("reservations.sharing.accept")}
          </Button>
        </div>
      </BandSection>
    </>
  );
}
