# Battle processor rules

Read the root `PRODUCT.md` and `ARCHITECTURE.md` before changing this package.

- Treat incoming battle payloads as recorded evidence. Preserve ordering,
  identifiers, hashes, and source meaning.
- Keep normalization deterministic and version mechanics that affect replay or
  derived statistics.
- A future simulator must build on explicit recorded versions; do not make
  current analysis pretend to be a complete Margonem engine.
- Add characterization tests before refactoring behavior with historical
  payload coverage.
- Do not update golden output solely to make a behavior change pass.

Before handoff, run the package's relevant tests and every directly affected
consumer check.
