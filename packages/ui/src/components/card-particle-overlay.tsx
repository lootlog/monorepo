import type { createCardOverlayElements } from "@lootlog/ui/lib/card-overlay-elements";

export function CardParticleOverlay({
  slot,
  elements,
}: {
  slot: string;
  elements: ReturnType<typeof createCardOverlayElements>;
}) {
  return (
    <div
      data-slot={slot}
      className={slot}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {elements.map((element) => (
        <div
          key={element.id}
          style={{
            position: "absolute",
            left: element.left,
            top: element.top,
            width: element.size,
            height: element.size,
            transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
            opacity: element.opacity,
            backgroundImage: `url("${element.image}")`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}
