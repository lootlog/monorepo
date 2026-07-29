import Image from "next/image";
import Link from "next/link";

export function DocsBrand() {
  return (
    <Link className="docs-brand" href="/docs" aria-label="Lootlog Dokumentacja">
      <Image
        src="/brand/lootlog-mark.svg"
        alt=""
        width={36}
        height={36}
        priority
      />
      <span className="docs-brand-copy">
        <strong>Lootlog</strong>
        <span>Dokumentacja</span>
      </span>
    </Link>
  );
}
