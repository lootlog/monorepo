import { Button } from "@lootlog/ui/components/button";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { MemberResponseDto as GuildMember } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { UserX } from "lucide-react";
import { useRef, useState } from "react";
import { MemberDeactivationDialog } from "./member-deactivation-dialog";

export type MemberDeactivationButtonProps = {
  member: GuildMember;
  onDeactivated: (member: GuildMember) => void;
  size?: "sm";
  className?: string;
};

export const MemberDeactivationButton = ({
  member,
  onDeactivated,
  size,
  className,
}: MemberDeactivationButtonProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [target, setTarget] = useState<{
    guildId: string;
    member: Pick<GuildMember, "userId" | "name">;
  } | null>(null);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="destructive"
        size={size}
        className={className}
        disabled={!guildId || !member.active || target !== null}
        onClick={() => {
          if (guildId) setTarget({ guildId, member });
        }}
      >
        <UserX className="size-4" />
        {t("settings.members.deactivate")}
      </Button>
      {target && (
        <MemberDeactivationDialog
          guildId={target.guildId}
          member={target.member}
          onClose={() => setTarget(null)}
          onDeactivated={onDeactivated}
          finalFocus={buttonRef}
        />
      )}
    </>
  );
};
