import { Link } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import { EmberSparks } from "@lootlog/ui/components/ember-sparks";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NpcKindLevel } from "@/components/npcs/npc-kind-level";
import { useAutoRotation } from "@/hooks/use-auto-rotation";
import { useNewBosses } from "@/hooks/use-new-bosses";
import { t } from "@/i18n/messages";
import { npcPageParams } from "@/lib/catalog-links";
import { BossPicker } from "./boss-picker";
import { HeroBossDrops } from "./hero-boss-drops";
import { PixelSprite } from "./pixel-sprite";

const ROTATION_MS = 8000;

export function HeroBoss() {
  const { bosses, isError } = useNewBosses();

  const rotation = useAutoRotation(
    bosses?.map(({ key }) => key) ?? [],
    ROTATION_MS,
  );

  if (isError) {
    return (
      <p role="alert" className="text-center text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!bosses) {
    return (
      <div aria-busy="true" className="flex flex-col items-center gap-6">
        <Skeleton className="h-56 w-48 rounded-2xl md:h-80" />
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  const monster =
    bosses.find((boss) => boss.key === rotation.activeKey) ?? bosses[0];

  if (!monster) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t("home.bossesEmpty")}
      </p>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-7"
      onPointerEnter={rotation.hold}
      onPointerLeave={rotation.release}
      onFocus={rotation.hold}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          rotation.release();
        }
      }}
    >
      <Link
        to="/npcs/$npcSlug"
        params={npcPageParams(monster)}
        className="group/boss flex flex-col items-center gap-6 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          key={monster.key}
          className="relative isolate flex h-56 items-end animate-rise-in md:h-80"
        >
          <span className="motion-safe:animate-sprite-float">
            {monster.icon ? (
              <PixelSprite
                src={npcIconUrl(monster.icon)}
                className="[zoom:2] md:[zoom:3]"
              />
            ) : null}
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-2 left-1/2 -z-10 h-4 w-[70%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-md motion-safe:animate-sprite-shadow"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-[-15%] bottom-0 isolate h-32"
          >
            <EmberSparks seed={monster.id} />
          </span>
        </span>
        <span className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm text-muted-foreground">
            {t("home.latestBoss")} · <NpcKindLevel npc={monster} />
          </span>
          <span className="text-2xl font-semibold tracking-[-0.02em] text-foreground group-hover/boss:underline md:text-3xl">
            {monster.name}
          </span>
        </span>
      </Link>

      <HeroBossDrops key={monster.key} boss={monster} />

      <div className="flex max-w-full items-center gap-2">
        <BossPicker
          bosses={bosses}
          pickedKey={monster.key}
          isRotating={rotation.isRotating}
          onPick={rotation.pick}
        />
        {rotation.canRotate ? (
          <button
            type="button"
            onClick={rotation.toggle}
            aria-label={
              rotation.isStopped
                ? t("home.resumeRotation")
                : t("home.pauseRotation")
            }
            title={
              rotation.isStopped
                ? t("home.resumeRotation")
                : t("home.pauseRotation")
            }
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            {rotation.isStopped ? (
              <Play aria-hidden="true" className="size-4" />
            ) : (
              <Pause aria-hidden="true" className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
