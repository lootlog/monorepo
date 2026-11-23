import type { AdminSession, AdminUser } from "@lootlog/schema/admin";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { text } from "@/lib/messages";
import { useUserAction } from "@/lib/use-user-action";

export function SessionsList({
  user,
  sessions,
}: {
  user: AdminUser;
  sessions: ReadonlyArray<AdminSession>;
}) {
  const { run } = useUserAction(user.id);
  const [revoking, setRevoking] = useState<string>();

  if (sessions.length === 0)
    return (
      <p className="text-sm text-muted-foreground">{text.sessionsEmpty}</p>
    );

  const revoke = async (sessionId: string) => {
    setRevoking(sessionId);
    await run({ action: "revoke-session", sessionId });
    setRevoking(undefined);
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-border">
        {sessions.map((session) => {
          const device = session.userAgent ?? text.unknownDevice;

          return (
            <li
              key={session.id}
              className="flex flex-col gap-3 py-3 first:pt-0 md:flex-row md:items-center md:justify-between"
            >
              <div className="grid min-w-0 gap-1">
                <p className="break-words text-sm font-medium">{device}</p>
                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <dt>{text.sessionIp}:</dt>
                    <dd>{session.ipAddress ?? text.unknownIp}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>{text.sessionLastActive}:</dt>
                    <dd>{formatDateTime(session.updatedAt)}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>{text.sessionExpires}:</dt>
                    <dd>{formatDateTime(session.expiresAt)}</dd>
                  </div>
                </dl>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-start md:self-auto"
                aria-label={text.sessionRevokeLabel(device)}
                loading={revoking === session.id}
                onClick={() => void revoke(session.id)}
              >
                {text.sessionRevoke}
              </Button>
            </li>
          );
        })}
      </ul>
      <div>
        <ConfirmDialog
          title={text.revokeAllConfirmTitle(user.name)}
          description={text.revokeAllConfirmDescription}
          confirmButtonLabel={text.sessionsRevokeAll}
          cancelButtonLabel={text.cancel}
          onConfirm={() => run({ action: "revoke-sessions" })}
          trigger={
            <Button variant="destructive">{text.sessionsRevokeAll}</Button>
          }
        />
      </div>
    </div>
  );
}
