import type { OtherHandle } from "@lootlog/margonem/others";
import { normalizeRuntimeOtherData } from "@/lib/margonem-runtime/runtime-adapter";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useOthersStore } from "@/store/others.store";

export function seedRuntimeOthers(
  handles: Readonly<Record<string, OtherHandle>>,
): void {
  runtimeOtherHandles.replace(handles);
  useOthersStore
    .getState()
    .replaceOthers(
      Object.fromEntries(
        Object.entries(handles).map(([id, handle]) => [
          id,
          normalizeRuntimeOtherData("d" in handle ? handle.d : handle),
        ]),
      ),
    );
}
