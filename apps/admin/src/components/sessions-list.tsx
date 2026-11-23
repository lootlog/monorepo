import type { AdminSession, AdminUser } from "@lootlog/schema/admin";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
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
  const { run, pending } = useUserAction(user.id);

  if (sessions.length === 0)
    return (
      <p className="text-sm text-muted-foreground">{text.sessionsEmpty}</p>
    );

  const isRevoking = (sessionId: string) =>
    pending?.action === "revoke-sessions" ||
    (pending?.action === "revoke-session" && pending.sessionId === sessionId);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-border">
        {sessions.map((session) => {
          const device = session.userAgent ?? text.unknownDevice;
          const revoking = isRevoking(session.id);

          return (
            <li
              key={session.id}
              aria-busy={revoking}
              className={`flex flex-col gap-3 py-3 transition-opacity duration-300 first:pt-0 md:flex-row md:items-center md:justify-between ${revoking ? "opacity-40" : ""}`}
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
                loading={
                  pending?.action === "revoke-session" &&
                  pending.sessionId === session.id
                }
                disabled={pending !== undefined}
                onClick={() =>
                  void run({ action: "revoke-session", sessionId: session.id })
                }
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
          confirmText={text.confirmWord}
          confirmLabel={text.confirmWordLabel(text.confirmWord)}
          disabled={pending !== undefined}
          onConfirm={() => run({ action: "revoke-sessions" })}
          trigger={
            <Button variant="destructive">{text.sessionsRevokeAll}</Button>
          }
        />
      </div>
    </div>
  );
}
