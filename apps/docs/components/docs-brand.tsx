import { Link } from "@tanstack/react-router";

export function DocsBrand() {
  return (
    <Link
      className="docs-brand"
      to="/docs/$"
      params={{ _splat: "" }}
      aria-label="Lootlog Dokumentacja"
    >
      <img
        src="/brand/lootlog-mark.svg"
        alt=""
        width={36}
        height={36}
        loading="eager"
        fetchPriority="high"
      />
      <span className="docs-brand-copy">
        <strong>Lootlog</strong>
        <span>Dokumentacja</span>
      </span>
    </Link>
  );
}
