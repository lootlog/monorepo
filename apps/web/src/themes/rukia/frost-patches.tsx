const getFrostPatchPlacement = (
  isX: boolean,
  isStart: boolean,
  pos: number,
) => {
  if (isX) {
    return {
      x: `${pos}%`,
      y: isStart ? "0px" : "auto",
      anchorX: "50%",
      anchorY: isStart ? "0%" : "100%",
    };
  }

  return {
    x: isStart ? "0px" : "auto",
    y: `${pos}%`,
    anchorX: isStart ? "0%" : "100%",
    anchorY: "50%",
  };
};

// Randomly generated frost patches along screen edges - irregular positions and sizes
const generateFrostPatches = () => {
  const patches: {
    x: string;
    y: string;
    w: number;
    h: number;
    anchorX: string;
    anchorY: string;
    opacity: number;
    scaleX: number;
    scaleY: number;
  }[] = [];

  const edges = [
    { side: "top", axis: "x" },
    { side: "bottom", axis: "x" },
    { side: "left", axis: "y" },
    { side: "right", axis: "y" },
  ] as const;

  for (const edge of edges) {
    const count = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const pos = Math.random() * 100;
      const size = 80 + Math.random() * 160;
      const opacity = 0.08 + Math.random() * 0.1;
      const stretch = 0.5 + Math.random() * 1;

      const isX = edge.axis === "x";
      const isStart = edge.side === "top" || edge.side === "left";
      const placement = getFrostPatchPlacement(isX, isStart, pos);

      patches.push({
        ...placement,
        w: isX ? size * stretch : size,
        h: isX ? size : size * stretch,
        opacity,
        scaleX: isX ? stretch : 1,
        scaleY: isX ? 1 : stretch,
      });
    }
  }

  return patches;
};

const frostPatchConfigs = generateFrostPatches();

export const FrostPatches = () => (
  <>
    {frostPatchConfigs.map((patch) => (
      <div
        key={`${patch.x}:${patch.y}`}
        className="absolute pointer-events-none"
        style={{
          left: patch.x === "auto" ? undefined : patch.x,
          right: patch.x === "auto" ? "0px" : undefined,
          top: patch.y === "auto" ? undefined : patch.y,
          bottom: patch.y === "auto" ? "0px" : undefined,
          width: patch.w,
          height: patch.h,
          transform: `translate(-50%, -50%) scale(${patch.scaleX}, ${patch.scaleY})`,
          background: `radial-gradient(ellipse at ${patch.anchorX} ${patch.anchorY}, rgba(220, 240, 255, ${patch.opacity}) 0%, transparent 60%)`,
          filter: "blur(20px)",
        }}
      />
    ))}
  </>
);
