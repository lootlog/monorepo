// Edge energy glow for the global overlay
export const DestructionEdgeGlow = () => (
  <div
    className="absolute inset-0"
    style={{
      background:
        "linear-gradient(180deg, rgba(200, 30, 60, 0.04) 0%, transparent 5%), " +
        "linear-gradient(0deg, rgba(200, 30, 60, 0.04) 0%, transparent 5%), " +
        "linear-gradient(90deg, rgba(200, 30, 60, 0.03) 0%, transparent 3%), " +
        "linear-gradient(270deg, rgba(200, 30, 60, 0.03) 0%, transparent 3%)",
    }}
  />
);
