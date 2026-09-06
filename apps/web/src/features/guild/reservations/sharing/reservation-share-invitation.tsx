import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { PageHeader } from "@/components/common/page-header";
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
      <div className="w-full max-w-xl" aria-live="polite">
        <PageHeader
          icon={CheckCircle2}
          title={<>{t("reservations.sharing.acceptedTitle")}</>}
          description={<>{t("reservations.sharing.acceptedDescription")}</>}
        >
          <SectionCardFooter>
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
          </SectionCardFooter>
        </PageHeader>
      </div>
    );
  }

  if (previewQuery.isError) {
    return (
      <div className="w-full max-w-xl" role="alert">
        <PageHeader
          icon={TriangleAlert}
          title={<>{t("reservations.sharing.invalidTitle")}</>}
          description={<>{t("reservations.sharing.invalidDescription")}</>}
        >
          <SectionCardFooter>
            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full sm:w-auto"
              onClick={() => navigate({ to: ROUTES.user.dashboard })}
            >
              {t("common.routeErrors.actions.goToDashboard")}
            </Button>
          </SectionCardFooter>
        </PageHeader>
      </div>
    );
  }

  if (!previewQuery.data) {
    return (
      <div className="w-full max-w-xl" aria-busy="true">
        <PageHeader
          title={<>{t("reservations.sharing.loadingTitle")}</>}
          description={<>{t("reservations.sharing.loadingDescription")}</>}
          status={<Spinner className="size-6" />}
        ></PageHeader>
      </div>
    );
  }

  const organizations = previewQuery.data?.eligibleTargetOrganizations ?? [];
  return (
    <div className="w-full max-w-xl">
      <PageHeader
        title={<>{t("reservations.sharing.invitationTitle")}</>}
        description={
          <>
            {t("reservations.sharing.invitationDescription", {
              organization: previewQuery.data.sourceOrganization.name,
            })}
          </>
        }
        status={
          <Avatar className="size-12 shrink-0 rounded-xl border border-border bg-muted">
            <AvatarImage
              src={previewQuery.data.sourceOrganization.iconUrl ?? undefined}
              alt=""
            />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
              <Link2 className="size-5" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
        }
      >
        <SectionCardContent>
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
              disabled={!targetGuildId}
              loading={acceptMutation.isPending}
              icon={<Link2 className="size-4" aria-hidden="true" />}
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
        </SectionCardContent>
      </PageHeader>
    </div>
  );
}
