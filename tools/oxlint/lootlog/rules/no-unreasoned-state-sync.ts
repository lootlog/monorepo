import { defineRule } from "@oxlint/plugins";

import { TEST_FILE, propertyName, unwrap } from "../ast.ts";
import { baselineOptionSchema, budgetedReporter } from "../budget.ts";

const EFFECT_HOOKS: ReadonlySet<string> = new Set([
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
]);

const EFFECT_HOOK_TEXT = /use(?:Layout|Insertion)?Effect\b/u;

const MESSAGE =
  "Stop and reconsider before keeping this effect. " +
  "Is it computable from props or state? Compute it during render; React Compiler memoizes it. " +
  "Does it respond to a user action? Do it in that handler. " +
  "Does it reset state when a prop changes? Key the component on that prop. " +
  "Does it tell a parent or store that a value changed? Do it where the change happens. " +
  "Does it load server data? Use a TanStack Query hook. " +
  "Does it read a value from outside React? Use the store's selector hook or useSyncExternalStore. " +
  "An effect that sets state another effect reads is one handler or one derivation. " +
  "An effect is right only when it keeps something outside React in step with this component while mounted: " +
  "a DOM node, listener, timer, socket, Margonem runtime hook, router, imperative toast, " +
  "or a resource held until unmount. " +
  "Moving the same logic into a ref or store to dodge this rule is not a fix. " +
  "If the effect does that, name what it keeps in step: " +
  "`// oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- <what it syncs with and why>`.";

export const noUnreasonedStateSyncRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Report every React effect hook, the usual way state gets synchronized; one that stays says why.",
    },
    schema: baselineOptionSchema,
  },
  create(context) {
    if (
      TEST_FILE.test(context.filename) ||
      !EFFECT_HOOK_TEXT.test(context.sourceCode.text)
    )
      return {};

    const findings = budgetedReporter(context);

    return {
      CallExpression(node) {
        const callee = unwrap(node.callee);

        const name =
          callee?.type === "MemberExpression" && !callee.computed
            ? propertyName(callee.property)
            : propertyName(callee);

        if (name !== undefined && EFFECT_HOOKS.has(name))
          findings.add(node, MESSAGE);
      },
      "Program:exit": findings.flush,
    };
  },
});
