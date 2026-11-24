import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DiscordIcon } from "@lootlog/ui/components/discord-icon";

import { links } from "@/config/links";

const memberCount = import.meta.env.LANDING_DISCORD_MEMBER_COUNT;

const memberCountFormat = new Intl.NumberFormat("pl-PL");

export function DiscordCommunityLink() {
  const { t } = useTranslation();

  if (memberCount === null) return null;

  return (
    <a
      href={links.discord}
      target="_blank"
      rel="noopener noreferrer"
      className="landing-discord-link"
    >
      <span className="landing-discord-link-icon">
        <DiscordIcon className="size-3.5" />
      </span>
      {t("landing.hero.discordMembers", {
        count: memberCount,
        formattedCount: memberCountFormat.format(memberCount),
      })}
      <ArrowUpRight
        className="landing-action-arrow size-3.5"
        aria-hidden="true"
      />
    </a>
  );
}
