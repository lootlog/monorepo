import {
  useEffect,
  useRef,
  type DependencyList,
  type EffectCallback,
} from "react";

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
};

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => deepEqual(item, right[index]))
    );
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => deepEqual(left[key], right[key]))
    );
  }

  return false;
};

const useDeepCompareSignal = (dependencies: DependencyList): number => {
  const dependenciesRef = useRef<DependencyList>(dependencies);
  const signalRef = useRef(0);

  if (!deepEqual(dependencies, dependenciesRef.current)) {
    dependenciesRef.current = dependencies;
    signalRef.current += 1;
  }

  return signalRef.current;
};

export const useDeepCompareEffect = (
  effect: EffectCallback,
  dependencies: DependencyList,
) => {
  const effectRef = useRef(effect);
  effectRef.current = effect;
  const dependencySignal = useDeepCompareSignal(dependencies);

  useEffect(() => effectRef.current(), [dependencySignal]);
};
