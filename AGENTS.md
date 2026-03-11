## Development Notes

- React Compiler handles memoization - don't use `memo`/`useMemo`
- Web app is not SSR
- See `.oxlintrc.md` for linting rules
- Always use descriptive variable names.
- Avoid excessive comments.
- Please use i18n in /apps/web.
- Never use `--no-verify` or otherwise bypass verification hooks. If verify fails, fix the issue or report the blocker instead of skipping checks.
- When doing refactors like code de-duplication, do not preserve old files. Update imports and delete old files instead of making files that are only exporting other files.
