import type { AdminUser } from "@lootlog/client/auth";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Textarea } from "@lootlog/ui/components/textarea";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { banDurationText, text } from "@/lib/messages";
import { useUserAction } from "@/lib/use-user-action";
import { BAN_DURATIONS, type BanDuration } from "@/lib/user-action";

const durationItems = BAN_DURATIONS.map((duration) => ({
  value: duration,
  label: banDurationText[duration],
}));

/** Bans a User, or shows the ban in force with the way to lift it. */
export function BanForm({ user }: { user: AdminUser }) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<BanDuration>("7d");
  const { run } = useUserAction(user.id);

  if (user.ban !== null)
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid gap-1 text-sm">
          <dt className="font-medium text-destructive">
            {user.ban.expiresAt === null
              ? text.bannedPermanently
              : text.bannedUntil(formatDateTime(user.ban.expiresAt))}
          </dt>
          <dd className="break-words text-muted-foreground">
            {text.banReason}: {user.ban.reason ?? text.noBanReason}
          </dd>
        </dl>
        <div>
          <ConfirmDialog
            variant="default"
            title={text.unbanConfirmTitle(user.name)}
            description={text.unbanConfirmDescription}
            confirmButtonLabel={text.unbanSubmit}
            cancelButtonLabel={text.cancel}
            onConfirm={() => run({ action: "unban" })}
            trigger={<Button>{text.unbanSubmit}</Button>}
          />
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="ban-reason">{text.banReasonLabel}</Label>
        <Textarea
          id="ban-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={3}
          aria-describedby="ban-reason-hint"
        />
        <p id="ban-reason-hint" className="text-xs text-muted-foreground">
          {text.banReasonHint}
        </p>
      </div>
      <div className="grid gap-1.5 sm:max-w-xs">
        <Label htmlFor="ban-duration">{text.banDurationLabel}</Label>
        <Select
          items={durationItems}
          value={duration}
          onValueChange={(value) => {
            if (value !== null) setDuration(value);
          }}
        >
          <SelectTrigger id="ban-duration" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {durationItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <ConfirmDialog
          title={text.banConfirmTitle(user.name)}
          description={text.banConfirmDescription}
          confirmButtonLabel={text.banSubmit}
          cancelButtonLabel={text.cancel}
          disabled={reason.trim() === ""}
          onConfirm={async () => {
            await run({ action: "ban", reason, duration });
            setReason("");
          }}
          trigger={<Button variant="destructive">{text.banSubmit}</Button>}
        />
      </div>
    </div>
  );
}
