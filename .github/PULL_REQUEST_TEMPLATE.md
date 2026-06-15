## Description

<!-- Provide a clear and concise description of your changes -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test updates
- [ ] Configuration/infrastructure changes

## Related Issues

<!-- Link related issues using #issue_number -->

Closes #
Related to #

## Changes Made

<!-- List the specific changes made in this PR -->

-
-
-

## Affected Components

<!-- Mark all that apply with an "x" -->

- [ ] Web Dashboard (`apps/web`)
- [ ] Game Client (`apps/game-client`)
- [ ] API Service (`apps/api`)
- [ ] Auth Service (`apps/auth`)
- [ ] Battlelog Service (`apps/battlelog-service`)
- [ ] Gateway (`apps/gateway`)
- [ ] Discord Bot (`apps/discord-bot`)
- [ ] Search Service (`apps/search`)
- [ ] Landing Page (`apps/landing`)
- [ ] Shared UI (`packages/ui`)
- [ ] Shared Types (`packages/types`)
- [ ] API Helpers (`packages/api-helpers`)
- [ ] CLI (`packages/cli`)
- [ ] Documentation
- [ ] Infrastructure (Docker, CI/CD)

## Database Changes

<!-- Mark with an "x" if applicable -->

- [ ] Includes database migrations
- [ ] Requires running `pnpm api:migrate:dev`
- [ ] Requires running `pnpm battlelog:migrate:dev`
- [ ] Requires running `pnpm auth:migrate:dev`
- [ ] No database changes

## Testing

<!-- Describe the tests you've added or run -->

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed
- [ ] All existing tests pass

### How to Test

<!-- Provide step-by-step instructions for testing your changes -->

1.
2.
3.

### Test Environment

<!-- Describe your test environment -->

- Node version:
- pnpm version:
- OS:
- Browser (if applicable):

## Screenshots/Recordings

<!-- If your changes affect the UI, please include screenshots or screen recordings -->

## Performance Impact

<!-- Describe any performance implications of your changes -->

- [ ] No performance impact
- [ ] Performance improvement (describe below)
- [ ] Potential performance impact (describe below)

## Breaking Changes

<!-- If this is a breaking change, describe what breaks and migration steps -->

- [ ] No breaking changes
- [ ] Breaking changes (describe below)

### Migration Guide

<!-- If breaking changes exist, provide a migration guide -->

## Checklist

<!-- Mark completed items with an "x" -->

### Code Quality

- [ ] My code follows the project's code style guidelines
- [ ] I have run `pnpm lint` and fixed all issues
- [ ] I have run `pnpm format` to format my code with Oxfmt
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings or errors

### Documentation

- [ ] I have updated the documentation (if applicable)
- [ ] I have updated the CLAUDE.md file (if architecture changed)
- [ ] I have added/updated JSDoc comments for new functions
- [ ] I have updated types in `packages/types` (if applicable)

### Testing

- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have tested my changes in development environment
- [ ] I have tested database migrations (if applicable)

### Dependencies

- [ ] I have checked that new dependencies are necessary
- [ ] I have used the latest stable versions of dependencies
- [ ] I have run `pnpm audit` to check for vulnerabilities
- [ ] I have updated package.json files correctly

### Environment Variables

- [ ] I have updated `.env.example` files (if new env vars added)
- [ ] I have documented all new environment variables
- [ ] I have updated the CLI env generator (if needed)

### Git

- [ ] My commits follow the Conventional Commits specification
- [ ] I have rebased my branch on the latest develop
- [ ] I have resolved all merge conflicts

## Additional Notes

<!-- Add any additional notes, concerns, or context for reviewers -->

## Reviewer Focus Areas

<!-- Highlight specific areas you'd like reviewers to pay attention to -->

-
- ***

  **By submitting this pull request, I confirm that:**

- [ ] I have read and understood the [Contributing Guidelines](../CONTRIBUTING.md)
- [ ] I agree to follow the [Code of Conduct](../CODE_OF_CONDUCT.md)
- [ ] My contribution is my own original work and I have the right to submit it under the project's MIT License
