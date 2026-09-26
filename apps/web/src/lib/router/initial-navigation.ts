export const createInitialNavigation = () => {
  let pending = true;

  return {
    consume: (preload: boolean) => {
      if (preload) return false;

      const initial = pending;
      pending = false;

      return initial;
    },
  };
};
