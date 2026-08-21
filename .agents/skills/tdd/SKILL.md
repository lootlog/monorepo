---
name: tdd
description: Develop a feature or fix a defect test-first when the user requests TDD or when a cheap, focused regression path already exists. Use for red-green-refactor, failing tests, regression coverage, and bugs with a practical Vitest, component, integration, or end-to-end seam.
---

# Test-driven development

Make the intended behavior executable before changing production code.

## Workflow

1. Identify the intended behavior, current behavior, affected public seam, and smallest observable reproduction.
2. Choose the narrowest existing test layer that can express the behavior. Prefer Vitest unit, component, or integration patterns already used by that workspace.
3. Add one focused failing test. Assert behavior, not private implementation.
4. Run it and confirm that it fails for the intended reason.
5. Make the smallest production change that passes the test.
6. Run the focused test again, then relevant adjacent tests, typecheck, and lint in proportion to the change.
7. Refactor only while the tests remain green.

## When a failing test is impractical

Do not build a large harness, mock most of the system, or introduce brittle timing merely to claim TDD. State why a focused failing test is not practical and use the closest executable check: a targeted script, an existing integration path, browser automation against the running app, a response assertion, or generated-output comparison.

## Guardrails

- Do not change assertions to bless incorrect behavior.
- Do not test private functions when a public seam exists.
- Mock only boundaries that cannot run locally.
- Keep regression coverage specific to the defect.
- For flaky behavior, first make the signal deterministic or measure its reproduction rate.

## Report

Name the failing-before evidence, the passing-after evidence, and every adjacent check performed. If no red test was practical, report the substitute evidence explicitly.
