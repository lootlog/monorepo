import type { AdminOrganizationDetails } from "@lootlog/schema/admin-organizations";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { Label } from "@lootlog/ui/components/label";
import { Textarea } from "@lootlog/ui/components/textarea";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { text } from "@/lib/messages";
import { useOrganizationAction } from "@/lib/use-organization-action";

export function OrganizationSuspension({
  details,
}: {
  details: AdminOrganizationDetails;
}) {
  const { organization, suspension } = details;
  const [reason, setReason] = useState("");
  const { run } = useOrganizationAction(organization.id);

  if (suspension !== null)
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid gap-1 text-sm">
          <dt className="font-medium text-destructive">
            {text.suspendedSince(formatDateTime(suspension.at))}
          </dt>
          <dd className="break-words text-muted-foreground">
            {text.suspensionReason}: {suspension.reason}
          </dd>
          {suspension.by === null ? null : (
            <dd className="text-muted-foreground">
              {text.suspendedBy(suspension.by)}
            </dd>
          )}
        </dl>
        <div>
          <ConfirmDialog
            variant="default"
            title={text.resumeConfirmTitle(organization.name)}
            description={text.resumeConfirmDescription}
            confirmButtonLabel={text.resumeSubmit}
            cancelButtonLabel={text.cancel}
            onConfirm={() => run({ action: "resume" })}
            trigger={<Button>{text.resumeSubmit}</Button>}
          />
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {organization.status === "inactive" ? (
        <p className="text-sm text-muted-foreground">{text.inactiveNotice}</p>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="suspend-reason">{text.suspendReasonLabel}</Label>
        <Textarea
          id="suspend-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={3}
          aria-describedby="suspend-reason-hint"
        />
        <p id="suspend-reason-hint" className="text-xs text-muted-foreground">
          {text.suspendReasonHint}
        </p>
      </div>
      <div>
        <ConfirmDialog
          title={text.suspendConfirmTitle(organization.name)}
          description={text.suspendConfirmDescription}
          confirmButtonLabel={text.suspendSubmit}
          cancelButtonLabel={text.cancel}
          disabled={reason.trim() === ""}
          onConfirm={async () => {
            await run({ action: "suspend", reason });
            setReason("");
          }}
          trigger={<Button variant="destructive">{text.suspendSubmit}</Button>}
        />
      </div>
    </div>
  );
}
