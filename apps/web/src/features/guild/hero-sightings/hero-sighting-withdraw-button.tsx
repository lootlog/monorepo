import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/hooks/auth/use-session";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  canClaimHeroSightings,
  canWithdrawAnyHeroSighting,
} from "@/lib/hero-sightings-permissions";
import { useWithdrawHeroSighting } from "./use-withdraw-hero-sighting";

type HeroSightingWithdrawButtonProps = {
  sighting: HeroSightingResponseDto;
};

export const HeroSightingWithdrawButton = ({
  sighting,
}: HeroSightingWithdrawButtonProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data: session } = useSession();
  const { data: accessPolicy } = useGuildPermissions();
  const { mutate, isPending } = useWithdrawHeroSighting();

  const isAuthor =
    sighting.detectedBy.userId !== null &&
    sighting.detectedBy.userId === session?.user.id;

  if (
    guildId === undefined ||
    !sighting.manual ||
    sighting.closedAt !== null ||
    !canClaimHeroSightings(accessPolicy) ||
    !(isAuthor || canWithdrawAnyHeroSighting(accessPolicy))
  )
    return null;

  const label = t("heroSightings.withdraw.label", { hero: sighting.hero.name });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      loading={isPending}
      onClick={() =>
        mutate({ pathParams: { guildId, sightingId: String(sighting.id) } })
      }
    >
      <Trash2 />
    </Button>
  );
};
