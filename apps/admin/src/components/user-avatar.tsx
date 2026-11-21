const DISCORD_CDN = "https://cdn.discordapp.com/";

/**
 * A User's Discord avatar, or their initial. The content security policy only
 * loads images from Discord's CDN, so any other address falls back too.
 */
export function UserAvatar({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  return image?.startsWith(DISCORD_CDN) ? (
    <img
      src={image}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      className="size-8 shrink-0 rounded-full bg-secondary"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold uppercase text-secondary-foreground"
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
