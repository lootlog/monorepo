export const getInterfaceName = () => {
  const isNI = typeof window.Engine === "object";
  return isNI ? "ni" : "si";
};
