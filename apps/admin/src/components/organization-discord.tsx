import type { AdminOrganizationDetails } from "@lootlog/schema/admin-organizations";
import { Button } from "@lootlog/ui/components/button";
import { formatDateTime } from "@/lib/format";
import { syncStatusText, text } from "@/lib/messages";
import { useOrganizationAction } from "@/lib/use-organization-action";

const when = (iso: string | null) => (iso === null ? "—" : formatDateTime(iso));

export function OrganizationDiscord({
  guildId,
  discord,
}: {
  guildId: string;
  discord: AdminOrganizationDetails["discord"];
}) {
  const { run, pending } = useOrganizationAction(guildId);

  const facts =
    discord === null
      ? []
      : [
          { label: text.discordStatus, value: syncStatusText[discord.status] },
          {
            label: text.discordChannels,
            value: text.discordChannelsValue(
              discord.selectableChannelCount,
              discord.channelCount,
            ),
          },
          {
            label: text.discordMissing,
            value:
              discord.missingPermissions.length === 0
                ? text.discordAllPermissions
                : discord.missingPermissions.join(", "),
          },
          {
            label: text.discordLastSuccess,
            value: when(discord.lastSuccessAt),
          },
          {
            label: text.discordLastAttempt,
            value: when(discord.lastAttemptAt),
          },
          ...(discord.lastError === null
            ? []
            : [{ label: text.discordLastError, value: discord.lastError }]),
        ];

  return (
    <div className="flex flex-col gap-4">
      {discord === null ? (
        <p className="text-sm text-muted-foreground">{text.discordNever}</p>
      ) : (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="grid min-w-0">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="break-words">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div>
        <Button
          variant="outline"
          disabled={pending !== undefined}
          onClick={() => run({ action: "refresh-discord-sync" })}
        >
          {text.discordRefresh}
        </Button>
      </div>
    </div>
  );
}
