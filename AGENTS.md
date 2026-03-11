## Development Notes

- React Compiler handles memoization - don't use `memo`/`useMemo`
- Web app is not SSR
- See `.oxlintrc.md` for linting rules
- Always use descriptive variable names.
- Avoid excessive comments.
- Please use i18n in /apps/web.
- When doing refactors like code de-duplication, do not preserve old files. Update imports and delete old files instead of making files that are only exporting other files.
